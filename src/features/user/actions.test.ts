import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — module factories run before imports below, per vi.mock hoisting.
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findFirst: vi.fn() },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBalance, getProfile } from "./actions";

interface MockedPrisma {
  profile: { findFirst: ReturnType<typeof vi.fn> };
}

interface MockedAuth {
  api: { getSession: ReturnType<typeof vi.fn> };
}

const mockedPrisma = prisma as unknown as MockedPrisma;
const mockedAuth = auth as unknown as MockedAuth;

function makeAuthSession(userId = "user_1") {
  return {
    user: { id: userId, email: "test@example.com", name: "Test User", emailVerified: true },
    session: { id: "sess_1" },
  };
}

function makeProfile(
  overrides: Partial<{
    bank: number;
    level: number;
    city: string | null;
    state: string | null;
    bio: string | null;
    deletedAt: Date | null;
    userId: string;
  }> = {},
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getBalance
// ---------------------------------------------------------------------------

describe("getBalance", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const result = await getBalance();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(mockedPrisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it("returns PROFILE_NOT_FOUND when the user is authenticated but has no active profile", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(null);

    const result = await getBalance();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_NOT_FOUND");
    }
  });

  it("queries with deletedAt: null so a soft-deleted profile is treated as not found", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(null);

    await getBalance();

    expect(mockedPrisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user_1", deletedAt: null },
    });
  });

  it("returns the bank value when an active profile exists", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(makeProfile({ bank: 42_000 }));

    const result = await getBalance();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({ bank: 42_000 });
  });
});

// ---------------------------------------------------------------------------
// getProfile
// ---------------------------------------------------------------------------

describe("getProfile", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockedAuth.api.getSession.mockResolvedValue(null);

    const result = await getProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNAUTHENTICATED");
    }
    expect(mockedPrisma.profile.findFirst).not.toHaveBeenCalled();
  });

  it("returns PROFILE_NOT_FOUND when the user is authenticated but has no active profile", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(null);

    const result = await getProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_NOT_FOUND");
    }
  });

  it("returns PROFILE_NOT_FOUND when the only matching profile is soft-deleted (excluded at the query level)", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    // deletedAt: null is baked into the where clause, so a soft-deleted
    // profile simply never comes back from findFirst — mock reflects that.
    mockedPrisma.profile.findFirst.mockResolvedValue(null);

    const result = await getProfile();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PROFILE_NOT_FOUND");
    }
    expect(mockedPrisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user_1", deletedAt: null },
    });
  });

  it("returns the full profile shape when an active profile exists", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession());
    mockedPrisma.profile.findFirst.mockResolvedValue(
      makeProfile({ bank: 7_500, level: 3, city: "Gotham", state: "NJ", bio: "A rogue." }),
    );

    const result = await getProfile();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      city: "Gotham",
      state: "NJ",
      bio: "A rogue.",
      bank: 7_500,
      level: 3,
    });
  });

  it("queries with deletedAt: null in the where clause", async () => {
    mockedAuth.api.getSession.mockResolvedValue(makeAuthSession("user_42"));
    mockedPrisma.profile.findFirst.mockResolvedValue(makeProfile({ userId: "user_42" }));

    await getProfile();

    expect(mockedPrisma.profile.findFirst).toHaveBeenCalledWith({
      where: { userId: "user_42", deletedAt: null },
    });
  });
});
