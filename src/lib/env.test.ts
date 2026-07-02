import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// env.ts parses process.env at module import time (`export const env = envSchema.parse(process.env)`),
// so each test stubs process.env then re-imports the module fresh via vi.resetModules().
const REQUIRED_ENV = {
  DATABASE_URL: "mysql://user@localhost:3306/casino",
  DATABASE_HOST: "localhost",
  DATABASE_USER: "root",
  DATABASE_PASSWORD: "some-password",
  DATABASE_NAME: "casino",
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  BLACKJACK_SESSION_SECRET: "session-secret",
} as const;

describe("env schema", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("parses successfully with a fully-populated, non-empty environment", async () => {
    process.env = { ...process.env, ...REQUIRED_ENV };
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_PASSWORD).toBe("some-password");
  });

  it("allows DATABASE_PASSWORD to be an empty string (passwordless local MariaDB dev user)", async () => {
    process.env = { ...process.env, ...REQUIRED_ENV, DATABASE_PASSWORD: "" };
    const { env } = await import("@/lib/env");
    expect(env.DATABASE_PASSWORD).toBe("");
  });

  it("fails when DATABASE_PASSWORD is missing entirely", async () => {
    process.env = { ...process.env, ...REQUIRED_ENV };
    delete process.env.DATABASE_PASSWORD;

    await expect(import("@/lib/env")).rejects.toBeDefined();
  });

  it("still fails when another required field, DATABASE_HOST, is an empty string", async () => {
    process.env = { ...process.env, ...REQUIRED_ENV, DATABASE_HOST: "" };

    await expect(import("@/lib/env")).rejects.toBeDefined();
  });
});
