import { describe, it, expect } from "vitest";
import { makeRng } from "./rng";

describe("makeRng", () => {
  it("same seed produces the same sequence", () => {
    const a = makeRng("deterministic");
    const b = makeRng("deterministic");
    expect(a()).toBe(b());
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("different seeds produce different sequences", () => {
    const seq = (seed: string) => {
      const rng = makeRng(seed);
      return Array.from({ length: 5 }, () => rng());
    };
    expect(seq("alpha")).not.toEqual(seq("beta"));
  });

  it("unseeded makeRng() does not throw and returns a number", () => {
    const rng = makeRng();
    expect(typeof rng()).toBe("number");
  });

  it("returns values in [0, 1)", () => {
    const rng = makeRng("range-check");
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
