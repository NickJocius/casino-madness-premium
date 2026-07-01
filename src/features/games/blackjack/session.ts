import { createActor, type Actor } from "xstate";
import { z } from "zod";
import { SUITS, RANKS, type Card } from "@/lib/game-core/types";
import type { Rng } from "@/lib/game-core/rng";
import { toMoney, toCents } from "@/lib/game-core/money";
import { blackjackMachine } from "@/features/games/blackjack/machines/blackjack.machine";
import type { BlackjackContext } from "@/features/games/blackjack/machines/blackjack.types";
import type { PayoutOutcome } from "@/features/games/blackjack/engine/payout";

export const BJ_COOKIE_NAME = "bj_session";
export const BJ_COOKIE_MAX_AGE_SECONDS = 60 * 30;

export interface SerializedBlackjackContext {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  betCents: number;
  outcome: PayoutOutcome | null;
  payoutCents: number | null;
}

export interface SerializedBlackjackSnapshot {
  value: string;
  context: SerializedBlackjackContext;
}

export interface BjCookiePayload {
  gameSessionId: string;
  snapshot: SerializedBlackjackSnapshot;
  balanceAfter: number;
}

// An HMAC-verified cookie only proves the bytes weren't tampered with by
// someone lacking BLACKJACK_SESSION_SECRET — it says nothing about whether the
// parsed JSON actually matches BjCookiePayload's shape. Client-supplied data
// crossing a trust boundary still needs zod validation per project convention.
const cardSchema = z.object({
  suit: z.enum(SUITS),
  rank: z.enum(RANKS),
});

const payoutOutcomeSchema = z.enum(["blackjack", "win", "push", "loss", "bust"]);

const serializedBlackjackSnapshotSchema = z.object({
  value: z.string(),
  context: z.object({
    deck: z.array(cardSchema),
    playerHand: z.array(cardSchema),
    dealerHand: z.array(cardSchema),
    betCents: z.number().int().nonnegative(),
    outcome: payoutOutcomeSchema.nullable(),
    payoutCents: z.number().int().nonnegative().nullable(),
  }),
});

export const bjCookiePayloadSchema = z.object({
  gameSessionId: z.string().min(1),
  snapshot: serializedBlackjackSnapshotSchema,
  balanceAfter: z.number().int(),
});

export interface InProgressView {
  playerHand: Card[];
  dealerVisibleCard: Card;
  currentState: string;
  balance: number;
}

export interface ResolvedView {
  playerHand: Card[];
  dealerHand: Card[];
  outcome: PayoutOutcome;
  payout: number;
  newBalance: number;
}

type BlackjackActor = Actor<typeof blackjackMachine>;

export function serializeSnapshot(actor: BlackjackActor): SerializedBlackjackSnapshot {
  const snapshot = actor.getSnapshot();
  const { context } = snapshot;
  return {
    value: snapshot.value,
    context: {
      deck: [...context.deck],
      playerHand: [...context.playerHand],
      dealerHand: [...context.dealerHand],
      betCents: toCents(context.bet),
      outcome: context.outcome,
      payoutCents: context.payout ? toCents(context.payout) : null,
    },
  };
}

// A rehydrated actor is always past the `dealing` state, and dealInitialHands
// is the ONLY action that calls rng (to shuffle a fresh deck via
// shuffle(makeDeck(), context.rng) in blackjack.machine.ts). HIT and STAND only
// ever call context.deck.slice(1) / context.deck[0] — they consume cards from
// the already-shuffled deck array that travels in the snapshot, they never
// reshuffle or draw fresh randomness. So a correctly-rehydrated actor has no
// legitimate reason to invoke rng again; if this throws, it means a future
// change to the machine added a new rng call site that rehydration doesn't
// account for, and that must be treated as a bug, not papered over.
const throwingRng: Rng = () => {
  throw new Error("blackjack rng invoked after rehydration — see comment above");
};

interface RestoredMachineSnapshot {
  status: "active";
  output: undefined;
  error: undefined;
  value: string;
  context: BlackjackContext;
  historyValue: Record<string, unknown>;
  children: Record<string, unknown>;
}

export function rehydrateActor(serialized: SerializedBlackjackSnapshot): BlackjackActor {
  const context: BlackjackContext = {
    rng: throwingRng,
    deck: serialized.context.deck,
    playerHand: serialized.context.playerHand,
    dealerHand: serialized.context.dealerHand,
    bet: toMoney(serialized.context.betCents),
    outcome: serialized.context.outcome,
    payout:
      serialized.context.payoutCents !== null ? toMoney(serialized.context.payoutCents) : null,
  };

  const restored: RestoredMachineSnapshot = {
    status: "active",
    output: undefined,
    error: undefined,
    value: serialized.value,
    context,
    historyValue: {},
    children: {},
  };

  // `input` is required by BlackjackInput's type even when restoring from a
  // snapshot; at runtime xstate's restore path (Actor#_initState) only reads
  // `options.snapshot` and never touches `options.input` when a snapshot is
  // present, so this value is inert — it exists purely to satisfy the type.
  const actor = createActor(blackjackMachine, { snapshot: restored, input: { rng: throwingRng } });
  actor.start();
  return actor;
}

export function toInProgressView(
  snapshot: SerializedBlackjackSnapshot,
  balance: number,
): InProgressView {
  return {
    playerHand: snapshot.context.playerHand,
    dealerVisibleCard: snapshot.context.dealerHand[0]!,
    currentState: snapshot.value,
    balance,
  };
}

export function toResolvedView(
  snapshot: SerializedBlackjackSnapshot,
  newBalance: number,
): ResolvedView {
  return {
    playerHand: snapshot.context.playerHand,
    dealerHand: snapshot.context.dealerHand,
    outcome: snapshot.context.outcome!,
    payout: snapshot.context.payoutCents!,
    newBalance,
  };
}
