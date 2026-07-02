import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — module factories run before imports below, per vi.mock hoisting.
// ---------------------------------------------------------------------------

const { MockPrismaClientKnownRequestError } = vi.hoisted(() => {
  class MockPrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return { MockPrismaClientKnownRequestError };
});

vi.mock("../../generated/prisma/client", () => ({
  Prisma: { PrismaClientKnownRequestError: MockPrismaClientKnownRequestError },
}));

vi.mock("./prisma", () => ({
  prisma: {
    profile: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from "./prisma";
import { ensureProfile } from "./profile-bootstrap";
import { DEFAULT_PROFILE_BANK, DEFAULT_PROFILE_LEVEL } from "./profile-defaults";

interface MockedPrisma {
  profile: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
}

const mockedPrisma = prisma as unknown as MockedPrisma;

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureProfile", () => {
  it("returns the existing Profile without creating one when it's already present", async () => {
    const existing = { id: "profile_1", userId: "user_1", bank: 500, level: 2 };
    mockedPrisma.profile.findFirst.mockResolvedValue(existing);

    const result = await ensureProfile("user_1");

    expect(result).toBe(existing);
    expect(mockedPrisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user_1", deletedAt: null },
    });
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates the Profile and a matching PAYOUT ledger row inside one prisma.$transaction when missing", async () => {
    mockedPrisma.profile.findFirst.mockResolvedValue(null);
    const tx = wireTransaction();

    await ensureProfile("user_2");

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.profile.create).toHaveBeenCalledWith({
      data: { userId: "user_2", bank: DEFAULT_PROFILE_BANK, level: DEFAULT_PROFILE_LEVEL },
    });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: {
        userId: "user_2",
        type: "PAYOUT",
        amount: DEFAULT_PROFILE_BANK,
        balanceAfter: DEFAULT_PROFILE_BANK,
      },
    });
  });

  it("writes through the transactional client, not the outer prisma singleton", async () => {
    mockedPrisma.profile.findFirst.mockResolvedValue(null);
    const tx = wireTransaction();

    await ensureProfile("user_3");

    expect(tx.profile.create).toHaveBeenCalledTimes(1);
    expect(tx.transaction.create).toHaveBeenCalledTimes(1);
  });

  it("records a positive signed amount equal to balanceAfter for the initial grant (ledger sign convention)", async () => {
    mockedPrisma.profile.findFirst.mockResolvedValue(null);
    const tx = wireTransaction();

    await ensureProfile("user_4");

    const [{ data }] = tx.transaction.create.mock.calls[0];
    expect(data.amount).toBe(data.balanceAfter);
    expect(data.amount).toBeGreaterThan(0);
  });

  it("re-reads and returns the winning Profile on a P2002 unique-constraint race instead of failing", async () => {
    const winner = { id: "profile_5", userId: "user_5", bank: DEFAULT_PROFILE_BANK, level: DEFAULT_PROFILE_LEVEL };
    mockedPrisma.profile.findFirst
      .mockResolvedValueOnce(null) // initial lookup: not found
      .mockResolvedValueOnce(winner); // re-read after P2002: found (created by a concurrent request)
    mockedPrisma.$transaction.mockRejectedValue(
      new MockPrismaClientKnownRequestError("Unique constraint failed", "P2002"),
    );

    const result = await ensureProfile("user_5");

    expect(result).toBe(winner);
  });

  it("rethrows a non-P2002 error from the transaction instead of swallowing it", async () => {
    mockedPrisma.profile.findFirst.mockResolvedValue(null);
    mockedPrisma.$transaction.mockRejectedValue(new Error("db unavailable"));

    await expect(ensureProfile("user_6")).rejects.toThrow("db unavailable");
  });
});
