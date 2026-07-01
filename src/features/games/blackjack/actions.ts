"use server";

import { headers, cookies } from "next/headers";
import { createActor } from "xstate";
import type { Prisma } from "../../../../generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { signCookie, verifyCookie } from "@/lib/signed-cookie";
import { makeRng } from "@/lib/game-core/rng";
import { blackjackMachine } from "@/features/games/blackjack/machines/blackjack.machine";
import { placeBetInput, playerActionInput } from "@/features/games/blackjack/schemas";
import {
  BJ_COOKIE_NAME,
  BJ_COOKIE_MAX_AGE_SECONDS,
  bjCookiePayloadSchema,
  serializeSnapshot,
  rehydrateActor,
  toInProgressView,
  toResolvedView,
} from "@/features/games/blackjack/session";
import type {
  BjCookiePayload,
  InProgressView,
  ResolvedView,
} from "@/features/games/blackjack/session";

type BlackjackActionError =
  | { code: "UNAUTHENTICATED"; message: string }
  | { code: "VALIDATION_ERROR"; message: string }
  | { code: "PROFILE_NOT_FOUND"; message: string }
  | { code: "INSUFFICIENT_FUNDS"; message: string }
  | { code: "SESSION_NOT_FOUND"; message: string }
  | { code: "CONCURRENT_UPDATE"; message: string };

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: BlackjackActionError };

function fail(code: BlackjackActionError["code"], message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

// Thrown inside a $transaction callback to abort and roll back before any
// writes are committed; caught just outside and mapped to SESSION_NOT_FOUND.
class SessionNotFoundError extends Error {}

// Thrown inside a $transaction callback when the guarded Profile.bank update
// (see creditPayout / the bet-deduction updateMany below) affects zero rows —
// i.e. bank no longer matches the value this action read earlier, meaning a
// concurrent request (double-submit, two tabs) already changed it. Rolls back
// and is mapped to CONCURRENT_UPDATE so the client can retry against the
// now-current balance instead of silently clobbering it.
class ConcurrentUpdateError extends Error {}

// Inserts a PAYOUT Transaction and applies the matching Profile.bank update in
// one guarded step, shared by startGame's immediate-natural-blackjack branch
// and playerAction's resolved branch so the ledger-write pattern can't drift
// between the two call sites. `expectedBank` is the bank value this action
// read earlier in the request — the updateMany guard turns a stale read into
// a ConcurrentUpdateError instead of an overwrite.
async function creditPayout(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    gameSessionId: string;
    payoutCents: number;
    expectedBank: number;
    finalBalance: number;
  },
): Promise<void> {
  const updated = await tx.profile.updateMany({
    where: { userId: params.userId, bank: params.expectedBank },
    data: { bank: params.finalBalance },
  });
  if (updated.count === 0) {
    throw new ConcurrentUpdateError();
  }
  await tx.transaction.create({
    data: {
      userId: params.userId,
      gameSessionId: params.gameSessionId,
      type: "PAYOUT",
      amount: params.payoutCents,
      balanceAfter: params.finalBalance,
    },
  });
}

export async function startGame(
  input: unknown,
): Promise<ActionResult<InProgressView | ResolvedView>> {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return fail("UNAUTHENTICATED", "You must be signed in to play.");

  const parsed = placeBetInput.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid bet amount.");
  const bet = parsed.data;

  const userId = authSession.user.id;
  const profile = await prisma.profile.findFirst({ where: { userId, deletedAt: null } });
  if (!profile) {
    return fail("PROFILE_NOT_FOUND", "No active profile found for this account.");
  }

  if (bet > profile.bank) {
    return fail("INSUFFICIENT_FUNDS", "Bet exceeds available balance.");
  }

  // Machine runs before any DB write: it's pure computation, so both possible
  // outcomes (still playing vs. an immediate natural-blackjack resolution) are
  // known up front and can each be written atomically below.
  const actor = createActor(blackjackMachine, { input: { rng: makeRng() } });
  actor.start();
  actor.send({ type: "PLACE_BET", amount: bet });
  actor.send({ type: "DEAL" });
  const snapshot = serializeSnapshot(actor);

  const betBalanceAfter = profile.bank - bet;

  if (snapshot.value !== "resolved") {
    let gameSession;
    try {
      gameSession = await prisma.$transaction(async (tx) => {
        const created = await tx.gameSession.create({
          data: {
            userId,
            gameType: "BLACKJACK",
            bet,
            outcome: null,
            payout: null,
          },
        });
        await tx.transaction.create({
          data: {
            userId,
            gameSessionId: created.id,
            type: "BET",
            amount: -bet,
            balanceAfter: betBalanceAfter,
          },
        });
        // Guarded by the bank value just read: a concurrent request that
        // already changed it makes this a no-op update (count 0) rather than
        // a silent overwrite.
        const updated = await tx.profile.updateMany({
          where: { userId, bank: profile.bank },
          data: { bank: betBalanceAfter },
        });
        if (updated.count === 0) {
          throw new ConcurrentUpdateError();
        }
        return created;
      });
    } catch (error) {
      if (error instanceof ConcurrentUpdateError) {
        return fail("CONCURRENT_UPDATE", "Balance changed — please try again.");
      }
      throw error;
    }

    const payload: BjCookiePayload = {
      gameSessionId: gameSession.id,
      snapshot,
      balanceAfter: betBalanceAfter,
    };
    (await cookies()).set(BJ_COOKIE_NAME, signCookie(payload, env.BLACKJACK_SESSION_SECRET), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: BJ_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });

    return { ok: true, data: toInProgressView(snapshot, betBalanceAfter) };
  }

  // Resolved immediately: a natural player blackjack (win or push) settles
  // inside DEAL, before playerTurn is ever reached. Credit the payout in the
  // same round trip as the bet — no cookie is needed since the round is over.
  const payoutCents = snapshot.context.payoutCents!;
  const finalBalance = betBalanceAfter + payoutCents;

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.gameSession.create({
        data: {
          userId,
          gameType: "BLACKJACK",
          bet,
          outcome: snapshot.context.outcome,
          payout: payoutCents,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.transaction.create({
        data: {
          userId,
          gameSessionId: created.id,
          type: "BET",
          amount: -bet,
          balanceAfter: betBalanceAfter,
        },
      });
      await creditPayout(tx, {
        userId,
        gameSessionId: created.id,
        payoutCents,
        expectedBank: profile.bank,
        finalBalance,
      });
    });
  } catch (error) {
    if (error instanceof ConcurrentUpdateError) {
      return fail("CONCURRENT_UPDATE", "Balance changed — please try again.");
    }
    throw error;
  }

  return { ok: true, data: toResolvedView(snapshot, finalBalance) };
}

export async function playerAction(
  input: unknown,
): Promise<ActionResult<InProgressView | ResolvedView>> {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return fail("UNAUTHENTICATED", "You must be signed in to play.");

  const parsed = playerActionInput.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", "Invalid action.");
  const action = parsed.data;

  const userId = authSession.user.id;
  const cookieStore = await cookies();
  const raw = cookieStore.get(BJ_COOKIE_NAME)?.value;
  const verified = raw ? verifyCookie<unknown>(raw, env.BLACKJACK_SESSION_SECRET) : null;
  if (verified === null) return fail("SESSION_NOT_FOUND", "No active round found.");

  // The HMAC check only proves the bytes weren't tampered with — it says
  // nothing about whether the parsed JSON matches BjCookiePayload's shape.
  const parsedPayload = bjCookiePayloadSchema.safeParse(verified);
  if (!parsedPayload.success) return fail("SESSION_NOT_FOUND", "No active round found.");
  const payload: BjCookiePayload = parsedPayload.data;

  const actor = rehydrateActor(payload.snapshot);
  actor.send({ type: action === "hit" ? "HIT" : "STAND" });
  const snapshot = serializeSnapshot(actor);

  if (snapshot.value !== "resolved") {
    const newPayload: BjCookiePayload = {
      gameSessionId: payload.gameSessionId,
      snapshot,
      balanceAfter: payload.balanceAfter,
    };
    cookieStore.set(BJ_COOKIE_NAME, signCookie(newPayload, env.BLACKJACK_SESSION_SECRET), {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: BJ_COOKIE_MAX_AGE_SECONDS,
      path: "/",
    });
    return { ok: true, data: toInProgressView(snapshot, payload.balanceAfter) };
  }

  const payoutCents = snapshot.context.payoutCents!;
  const finalBalance = payload.balanceAfter + payoutCents;

  try {
    await prisma.$transaction(async (tx) => {
      // updateMany (not update) so a userId mismatch yields a zero-count result
      // to branch on, rather than a thrown not-found error from Prisma.
      const updated = await tx.gameSession.updateMany({
        where: { id: payload.gameSessionId, userId },
        data: {
          outcome: snapshot.context.outcome,
          payout: payoutCents,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
      if (updated.count === 0) {
        throw new SessionNotFoundError();
      }
      await creditPayout(tx, {
        userId,
        gameSessionId: payload.gameSessionId,
        payoutCents,
        expectedBank: payload.balanceAfter,
        finalBalance,
      });
    });
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return fail("SESSION_NOT_FOUND", "No active round found.");
    }
    if (error instanceof ConcurrentUpdateError) {
      return fail("CONCURRENT_UPDATE", "Balance changed — please try again.");
    }
    throw error;
  }

  cookieStore.delete(BJ_COOKIE_NAME);
  return { ok: true, data: toResolvedView(snapshot, finalBalance) };
}
