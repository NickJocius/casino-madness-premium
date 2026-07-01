import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — module factories run before imports below, per vi.mock hoisting.
//
// betterAuth() is mocked to just return its config object untouched, so that
// `auth.databaseHooks.user.create.after` is the real callback from
// src/lib/auth.ts, invokable directly without spinning up Better Auth itself.
// ---------------------------------------------------------------------------

vi.mock("dotenv/config", () => ({}));

vi.mock("better-auth", () => ({
  betterAuth: vi.fn((config: unknown) => config),
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => ({})),
}));

vi.mock("./prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from "./prisma";
import { auth } from "./auth";
import { DEFAULT_PROFILE_BANK, DEFAULT_PROFILE_LEVEL } from "./profile-defaults";

interface MockedPrisma {
  $transaction: ReturnType<typeof vi.fn>;
}

const mockedPrisma = prisma as unknown as MockedPrisma;

// Minimal tx double mirroring the two calls the hook makes.
function makeTx() {
  return {
    profile: { create: vi.fn().mockResolvedValue({ id: "profile_1" }) },
    transaction: { create: vi.fn().mockResolvedValue({ id: "txn_1" }) },
  };
}

type Tx = ReturnType<typeof makeTx>;

function wireTransaction(): Tx {
  const tx = makeTx();
  mockedPrisma.$transaction.mockImplementation(async (cb: (tx: Tx) => unknown) => cb(tx));
  return tx;
}

interface AuthConfig {
  databaseHooks: {
    user: {
      create: {
        after: (user: { id: string }) => Promise<void>;
      };
    };
  };
}

const authConfig = auth as unknown as AuthConfig;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("databaseHooks.user.create.after", () => {
  it("creates the Profile and a matching PAYOUT ledger row inside one prisma.$transaction", async () => {
    const tx = wireTransaction();

    await authConfig.databaseHooks.user.create.after({ id: "user_1" });

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.profile.create).toHaveBeenCalledWith({
      data: { userId: "user_1", bank: DEFAULT_PROFILE_BANK, level: DEFAULT_PROFILE_LEVEL },
    });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        type: "PAYOUT",
        amount: DEFAULT_PROFILE_BANK,
        balanceAfter: DEFAULT_PROFILE_BANK,
      },
    });
  });

  it("calls tx.profile.create and tx.transaction.create on the transactional client, not the outer prisma singleton", async () => {
    const tx = wireTransaction();

    await authConfig.databaseHooks.user.create.after({ id: "user_2" });

    // Only the interactive-transaction methods on `tx` are exercised; the
    // outer `prisma` mock exposes no profile/transaction methods at all, so
    // any accidental call through the outer client would throw instead of
    // silently succeeding — this assertion just documents that the hook
    // wrote through `tx` where we can observe it.
    expect(tx.profile.create).toHaveBeenCalledTimes(1);
    expect(tx.transaction.create).toHaveBeenCalledTimes(1);
  });

  it("records a positive signed amount equal to balanceAfter for the initial grant (ledger sign convention for PAYOUT rows)", async () => {
    const tx = wireTransaction();

    await authConfig.databaseHooks.user.create.after({ id: "user_3" });

    const [{ data }] = tx.transaction.create.mock.calls[0];
    expect(data.amount).toBe(data.balanceAfter);
    expect(data.amount).toBeGreaterThan(0);
  });

  it("swallows a failure from prisma.$transaction instead of throwing, so it never blocks Better Auth's sign-up flow", async () => {
    mockedPrisma.$transaction.mockRejectedValue(new Error("db unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      authConfig.databaseHooks.user.create.after({ id: "user_4" }),
    ).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("user_4"),
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
