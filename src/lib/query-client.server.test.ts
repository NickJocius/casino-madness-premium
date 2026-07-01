import { describe, it, expect, vi } from "vitest";

// Force the `isServer` branch: @tanstack/react-query computes `isServer` once
// at module-evaluation time as `typeof window === "undefined" || "Deno" in
// globalThis`. In this project's jsdom test environment `window` is always
// defined, so we can't reach the server branch without mocking the export
// directly (see query-client.browser.test.ts for the untouched jsdom-default
// "browser" behavior).
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, isServer: true };
});

import { getQueryClient } from "./query-client";

describe("getQueryClient — server (isServer: true)", () => {
  it("returns a fresh QueryClient instance on every call", () => {
    const first = getQueryClient();
    const second = getQueryClient();

    expect(first).not.toBe(second);
  });
});
