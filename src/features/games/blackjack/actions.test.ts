import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — module factories run before imports below, per vi.mock hoisting.
// ---------------------------------------------------------------------------

// Controls which seed the mocked makeRng() (no-arg call site in actions.ts)
// forwards to. Only the "reaches playerTurn" test cares about this; every
// other test either fails before the machine is created or bypasses the
// machine entirely via a hand-crafted snapshot + rehydrateActor.
const rngSeedBox = { seed: "bj-test-seed-1" };

vi.mock("@/lib/game-core/rng", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/game-core/rng")>();
  return {
    ...actual,
    makeRng: vi.fn(() => actual.makeRng(rngSeedBox.seed)),
  };
});

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "mysql://test",
    BETTER_AUTH_SECRET: "test-better-auth-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-client-secret",
    BLACKJACK_SESSION_SECRET: "test-bj-session-secret",
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => mockCookieStore),
}));

vi.mock("@/lib/signed-cookie", () => ({
  signCookie: vi.fn(() => "signed.cookie.value"),
  verifyCookie: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyCookie } from "@/lib/signed-cookie";
import { startGame, playerAction } from "./actions";
import type { InProgressView, ResolvedView } from "./session";
import type { BjCookiePayload } from "./session";

// ---------------------------------------------------------------------------
// Typed handles onto the mocked modules (the mock factories above return
// plain vi.fn()-based objects, not real PrismaClient/auth instances, so we
// narrow to the shape actions.ts actually calls).
// ---------------------------------------------------------------------------

interface MockedPrisma {
  profile: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
}

interface MockedAuth {
  api: { getSession: ReturnType<typeof vi.fn> };
}

const mockedPrisma = prisma as unknown as MockedPrisma;
const mockedAuth = auth as unknown as MockedAuth;
const mockedVerifyCookie = verifyCookie as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAuthSession(userId = "user_1") {
  return {
    user: { id: userId, email: "test@example.com", name: "Test User", emailVerified: true },
    session: { id: "sess_1" },
  };
}

function makeProfile(
  overrides: Partial<{ bank: number; deletedAt: Date | null; userId: string }> = {},
) {
  return {
    id: "profile_1",
    userId: "user_1",
    city: null,
    state: null,
    bio: null,
    bank: 5000,
    level: 1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    deletedAt: null,
    ...overrides,
  };
}

// tx mock passed into prisma.$transaction's callback — mirrors the exact
// methods actions.ts calls (gameSession.create/updateMany, transaction.create,
// profile.updateMany) with plausible resolved values. profile.updateMany
// defaults to { count: 1 } (the success case — the guarded bank value
// matched, so the update actually applied); individual tests override this
// to { count: 0 } to simulate a concurrent balance change.
function makeTx() {
  return {
    gameSession: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "gs_1",
        ...args.data,
      })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    transaction: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "tx_1",
        ...args.data,
      })),
    },
    profile: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
}

type Tx = ReturnType<typeof makeTx>;

function wireTransaction(): Tx {
  const tx = makeTx();
  mockedPrisma.$transaction.mockImplementation(async (cb: (tx: Tx) => unknown) => cb(tx));
  return tx;
}

beforeEach(() => {
  vi.clearAllMocks();
  rngSeedBox.seed = "bj-test-seed-1";
  mockCookieStore.get.mockReset();
  mockCookieStore.set.mockReset();
  mockCookieStore.delete.mockReset();
  mockedVerifyCookie.mockReset();
  mockedVerifyCookie.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// 1. Validation errors
// ---------------------------------------------------------------------------

describe("startGame — validation", () => {
  it.each([0, -100, 100_001, 1.5])(
    "rejects invalid bet %p with VALIDATION_ERROR",
    async (badBet) => {
      mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());

      const result = await startGame(badBet);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
      expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it("rejects a non-numeric bet with VALIDATION_ERROR", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());

    const result = await startGame("not-a-number");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("playerAction — validation", () => {
  it("rejects an invalid action string with VALIDATION_ERROR", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());

    const result = await playerAction("fold");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([0, null, undefined, {}])(
    "rejects non-enum input %p with VALIDATION_ERROR",
    async (bad) => {
      mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());

      const result = await playerAction(bad);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
      expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    },
  );
});

// ---------------------------------------------------------------------------
// 2. Insufficient funds
// ---------------------------------------------------------------------------

describe("startGame — insufficient funds", () => {
  it("returns INSUFFICIENT_FUNDS and performs no DB writes when bet exceeds bank", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(makeProfile({ bank: 500 }));

    const result = await startGame(1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INSUFFICIENT_FUNDS");
    }
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Hole card absent pre-resolution
// ---------------------------------------------------------------------------

describe("startGame — hole card concealment", () => {
  it("returns dealerVisibleCard (single card) and no dealerHand key when the round is still in progress", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(makeProfile({ bank: 100_000 }));
    const tx = wireTransaction();

    // Seed chosen (verified out-of-band) to deal a non-natural opening hand,
    // so the round lands in playerTurn rather than resolving immediately.
    rngSeedBox.seed = "bj-test-seed-1";

    const result = await startGame(1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as InProgressView;
    expect(data.dealerVisibleCard).toBeDefined();
    expect(typeof data.dealerVisibleCard.rank).toBe("string");
    expect(typeof data.dealerVisibleCard.suit).toBe("string");
    expect(result.data).not.toHaveProperty("dealerHand");
    expect(data.currentState).toBe("playerTurn");
    expect(data.balance).toBe(99_000);
    expect(data.playerHand).toHaveLength(2);

    // BET transaction + cache update happened atomically; cookie was set.
    expect(tx.gameSession.create).toHaveBeenCalledWith({
      data: { userId: "user_1", gameType: "BLACKJACK", bet: 1000, outcome: null, payout: null },
    });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        gameSessionId: "gs_1",
        type: "BET",
        amount: -1000,
        balanceAfter: 99_000,
      },
    });
    expect(tx.profile.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", bank: 100_000 },
      data: { bank: 99_000 },
    });
    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Deleted profile
// ---------------------------------------------------------------------------

describe("startGame — deleted profile", () => {
  it("returns PROFILE_NOT_FOUND and performs no DB writes when the profile is soft-deleted (excluded at the query level)", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    // The query now filters on deletedAt: null, so a soft-deleted profile
    // simply never comes back from findFirst — it resolves null, exactly
    // like "no profile at all".
    mockedPrisma.profile.findFirst.mockResolvedValue(null);

    const result = await startGame(1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_NOT_FOUND");
    }
    expect(mockedPrisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user_1", deletedAt: null },
    });
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns PROFILE_NOT_FOUND when no profile exists at all", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(null);

    const result = await startGame(1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_NOT_FOUND");
    }
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated (bonus — cheap to cover, exercises the first guard clause)
// ---------------------------------------------------------------------------

describe("unauthenticated access", () => {
  it("startGame returns UNAUTHENTICATED when there is no session", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const result = await startGame(1000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(mockedPrisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it("playerAction returns UNAUTHENTICATED when there is no session", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const result = await playerAction("hit");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Resolved round — chained balanceAfter math via a hand-crafted snapshot
// ---------------------------------------------------------------------------

describe("playerAction — resolved round produces correct ledger rows", () => {
  it("STAND leading to a deterministic dealer bust writes a single PAYOUT transaction with chained balanceAfter", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    const tx = wireTransaction();

    // Player stands at a fixed, non-bust, non-blackjack 18. Dealer starts at 4
    // and the remaining deck is engineered so two forced hits push the dealer
    // to 24 (bust) — deterministic, no RNG involved (HIT/STAND only ever
    // consume deck[0] / deck.slice(1)).
    const craftedPayload: BjCookiePayload = {
      gameSessionId: "gs_existing",
      balanceAfter: 4000, // e.g. 5000 bank - 1000 bet, already deducted at bet time
      snapshot: {
        value: "playerTurn",
        context: {
          deck: [
            { suit: "spades", rank: "K" },
            { suit: "clubs", rank: "K" },
          ],
          playerHand: [
            { suit: "hearts", rank: "9" },
            { suit: "diamonds", rank: "9" },
          ],
          dealerHand: [
            { suit: "clubs", rank: "2" },
            { suit: "diamonds", rank: "2" },
          ],
          betCents: 1000,
          outcome: null,
          payoutCents: null,
        },
      },
    };
    mockCookieStore.get.mockReturnValue({ value: "signed-cookie-raw" });
    mockedVerifyCookie.mockReturnValue(craftedPayload);

    const result = await playerAction("stand");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as ResolvedView;
    expect(data.outcome).toBe("win"); // dealer busted at 24
    expect(data.payout).toBe(2000); // 'win' pays 2x bet (1000 * 2)
    expect(data.newBalance).toBe(6000); // 4000 (payload.balanceAfter) + 2000 (payout)
    expect(data.dealerHand).toHaveLength(4); // 2 + 2 forced hits to reach 24
    expect(data.playerHand).toHaveLength(2);

    expect(tx.gameSession.updateMany).toHaveBeenCalledWith({
      where: { id: "gs_existing", userId: "user_1" },
      data: expect.objectContaining({ outcome: "win", payout: 2000 }),
    });

    // Exactly one Transaction row is written by playerAction's resolved
    // branch (the BET row was already written by startGame) — PAYOUT with
    // the chained balanceAfter (payload.balanceAfter + payoutCents).
    expect(tx.transaction.create).toHaveBeenCalledTimes(1);
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        gameSessionId: "gs_existing",
        type: "PAYOUT",
        amount: 2000,
        balanceAfter: 6000,
      },
    });

    expect(tx.profile.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", bank: 4000 },
      data: { bank: 6000 },
    });

    // Round is over — cookie is cleared, not re-signed.
    expect(mockCookieStore.delete).toHaveBeenCalledWith("bj_session");
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });

  it("HIT leading to a deterministic player bust writes a zero PAYOUT transaction with chained (unchanged) balanceAfter", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    const tx = wireTransaction();

    // Player at 16, forced next card is a King (value 10) -> busts at 26.
    const craftedPayload: BjCookiePayload = {
      gameSessionId: "gs_existing_2",
      balanceAfter: 4000,
      snapshot: {
        value: "playerTurn",
        context: {
          deck: [{ suit: "clubs", rank: "K" }],
          playerHand: [
            { suit: "hearts", rank: "K" },
            { suit: "diamonds", rank: "6" },
          ],
          dealerHand: [
            { suit: "spades", rank: "7" },
            { suit: "clubs", rank: "9" },
          ],
          betCents: 1000,
          outcome: null,
          payoutCents: null,
        },
      },
    };
    mockCookieStore.get.mockReturnValue({ value: "signed-cookie-raw" });
    mockedVerifyCookie.mockReturnValue(craftedPayload);

    const result = await playerAction("hit");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as ResolvedView;
    expect(data.outcome).toBe("bust");
    expect(data.payout).toBe(0);
    expect(data.newBalance).toBe(4000); // unchanged: 4000 + 0

    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        gameSessionId: "gs_existing_2",
        type: "PAYOUT",
        amount: 0,
        balanceAfter: 4000,
      },
    });
    expect(tx.profile.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", bank: 4000 },
      data: { bank: 4000 },
    });
  });

  it("returns SESSION_NOT_FOUND without writing when the game session no longer belongs to the user", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    // updateMany matches nothing -> SessionNotFoundError -> mapped to SESSION_NOT_FOUND
    mockedPrisma.$transaction.mockImplementation(async (cb: (tx: Tx) => unknown) => {
      const tx = makeTx();
      tx.gameSession.updateMany.mockResolvedValue({ count: 0 });
      return cb(tx);
    });

    const craftedPayload: BjCookiePayload = {
      gameSessionId: "gs_other_user",
      balanceAfter: 4000,
      snapshot: {
        value: "playerTurn",
        context: {
          deck: [{ suit: "clubs", rank: "K" }],
          playerHand: [
            { suit: "hearts", rank: "K" },
            { suit: "diamonds", rank: "6" },
          ],
          dealerHand: [
            { suit: "spades", rank: "7" },
            { suit: "clubs", rank: "9" },
          ],
          betCents: 1000,
          outcome: null,
          payoutCents: null,
        },
      },
    };
    mockCookieStore.get.mockReturnValue({ value: "signed-cookie-raw" });
    mockedVerifyCookie.mockReturnValue(craftedPayload);

    const result = await playerAction("hit");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SESSION_NOT_FOUND");
    }
  });

  it("returns SESSION_NOT_FOUND when the cookie is missing or fails verification", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockCookieStore.get.mockReturnValue(undefined);
    mockedVerifyCookie.mockReturnValue(null);

    const result = await playerAction("hit");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SESSION_NOT_FOUND");
    }
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Optimistic-concurrency guard — Profile.bank changed since this action
// read it (a concurrent request already applied a write in between).
// ---------------------------------------------------------------------------

describe("playerAction — concurrent balance update", () => {
  it("returns CONCURRENT_UPDATE when profile.updateMany affects zero rows in the resolved branch", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    const tx = wireTransaction();
    // Simulates a concurrent request having already changed Profile.bank
    // since this action's cookie payload (balanceAfter) was read.
    tx.profile.updateMany.mockResolvedValue({ count: 0 });

    const craftedPayload: BjCookiePayload = {
      gameSessionId: "gs_existing",
      balanceAfter: 4000,
      snapshot: {
        value: "playerTurn",
        context: {
          deck: [
            { suit: "spades", rank: "K" },
            { suit: "clubs", rank: "K" },
          ],
          playerHand: [
            { suit: "hearts", rank: "9" },
            { suit: "diamonds", rank: "9" },
          ],
          dealerHand: [
            { suit: "clubs", rank: "2" },
            { suit: "diamonds", rank: "2" },
          ],
          betCents: 1000,
          outcome: null,
          payoutCents: null,
        },
      },
    };
    mockCookieStore.get.mockReturnValue({ value: "signed-cookie-raw" });
    mockedVerifyCookie.mockReturnValue(craftedPayload);

    const result = await playerAction("stand");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CONCURRENT_UPDATE");
    }

    // creditPayout now runs the guarded profile.updateMany BEFORE creating the
    // PAYOUT transaction row, so a count:0 result genuinely prevents that
    // insert within this callback invocation — this is no longer just
    // relying on Prisma's transaction-abort rollback semantics.
    expect(tx.transaction.create).not.toHaveBeenCalled();

    // Nothing past the throw inside the $transaction callback executes: no
    // cookie mutation happens (neither a re-signed in-progress cookie nor a
    // delete of the resolved-round cookie) — this is the only part of "the
    // transaction rolled back" that's actually observable through the mocks
    // used here (the mocked tx itself doesn't model rollback of prior calls
    // within the same callback invocation).
    expect(mockCookieStore.delete).not.toHaveBeenCalled();
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. Cookie payload zod validation — HMAC-valid but shape-invalid payload
// ---------------------------------------------------------------------------

describe("playerAction — cookie payload schema validation", () => {
  it("returns SESSION_NOT_FOUND when the HMAC-verified payload does not match bjCookiePayloadSchema", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockCookieStore.get.mockReturnValue({ value: "signed-cookie-raw" });
    // Passes HMAC verification (verifyCookie returns non-null) but the shape
    // is wrong: gameSessionId is a number, snapshot is missing required
    // fields entirely, and balanceAfter is a string instead of an int.
    mockedVerifyCookie.mockReturnValue({
      gameSessionId: 123,
      snapshot: {},
      balanceAfter: "oops",
    });

    const result = await playerAction("hit");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SESSION_NOT_FOUND");
    }
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 8. startGame — immediate resolution on a natural player blackjack dealt by
// DEAL, before playerTurn is ever reached.
// ---------------------------------------------------------------------------

describe("startGame — immediate resolution (natural blackjack on deal)", () => {
  it("resolves in one round trip: BET + PAYOUT rows chained, profile.updateMany to the combined balance, and no cookie set", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(makeProfile({ bank: 100_000 }));
    const tx = wireTransaction();

    // Seed found via brute-force search (see task notes) to deal the player
    // an opening K+A (natural blackjack) against a non-blackjack dealer hand
    // (5+J = 15), so DEAL resolves the round immediately instead of landing
    // in playerTurn.
    rngSeedBox.seed = "natural-search-37";

    const result = await startGame(1000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as ResolvedView;
    expect(data.outcome).toBe("blackjack");
    expect(data.payout).toBe(2500); // 3:2 blackjack payout on a 1000 bet (1000 + 1500)
    expect(data.newBalance).toBe(101_500); // 100_000 - 1000 (bet) + 2500 (payout)
    expect(data.playerHand).toHaveLength(2);
    expect(data.dealerHand).toHaveLength(2); // full reveal — round is over

    // BET row: bank 100_000 -> 99_000.
    expect(tx.transaction.create).toHaveBeenNthCalledWith(1, {
      data: {
        userId: "user_1",
        gameSessionId: "gs_1",
        type: "BET",
        amount: -1000,
        balanceAfter: 99_000,
      },
    });
    // PAYOUT row (via creditPayout): chained from the bet balance.
    expect(tx.transaction.create).toHaveBeenNthCalledWith(2, {
      data: {
        userId: "user_1",
        gameSessionId: "gs_1",
        type: "PAYOUT",
        amount: 2500,
        balanceAfter: 101_500,
      },
    });
    expect(tx.transaction.create).toHaveBeenCalledTimes(2);

    // creditPayout guards on the bank value read before any writes in this
    // request (profile.bank as read up front) and applies the final
    // combined balance in one step.
    expect(tx.profile.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", bank: 100_000 },
      data: { bank: 101_500 },
    });
    expect(tx.profile.updateMany).toHaveBeenCalledTimes(1);

    // No cookie is needed — the round is already over.
    expect(mockCookieStore.set).not.toHaveBeenCalled();
  });
});
