import { describe, it, expect } from "vitest";
import { getQueryClient, makeQueryClient } from "./query-client";

// No mocking here: vitest's jsdom environment defines `window`, so
// @tanstack/react-query's `isServer` is naturally `false` — this file
// exercises the real "browser" branch of getQueryClient.

describe("getQueryClient — browser (isServer: false)", () => {
  it("returns the same singleton instance across repeated calls", () => {
    const first = getQueryClient();
    const second = getQueryClient();
    const third = getQueryClient();

    expect(first).toBe(second);
    expect(second).toBe(third);
  });
});

describe("makeQueryClient — defaults", () => {
  it("sets staleTime to 30 seconds and retry to 1 on the default query options", () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.retry).toBe(1);
  });

  it("returns a distinct instance each time it is called", () => {
    const a = makeQueryClient();
    const b = makeQueryClient();

    expect(a).not.toBe(b);
  });
});
