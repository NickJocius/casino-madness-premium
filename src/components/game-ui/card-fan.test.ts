import { describe, it, expect } from "vitest";
import { fanRotationDeg } from "./card-fan";

describe("fanRotationDeg", () => {
  it("reproduces the hardcoded 4-card fan ([-9, -3, 3, 9]) at the default 6deg step", () => {
    const total = 4;
    const rotations = [0, 1, 2, 3].map((i) => fanRotationDeg(i, total));

    expect(rotations).toEqual([-9, -3, 3, 9]);
  });

  it("centers a single card at 0deg", () => {
    expect(fanRotationDeg(0, 1)).toBe(0);
  });

  it("centers a 2-card hand symmetrically around 0deg", () => {
    expect(fanRotationDeg(0, 2)).toBe(-3);
    expect(fanRotationDeg(1, 2)).toBe(3);
  });

  it("centers an odd-length hand with a true 0deg middle card", () => {
    // total=5: indices 0..4, middle index 2 should be exactly 0deg.
    expect(fanRotationDeg(2, 5)).toBe(0);
    expect(fanRotationDeg(0, 5)).toBe(-12);
    expect(fanRotationDeg(4, 5)).toBe(12);
  });

  it("respects a custom stepDeg", () => {
    expect(fanRotationDeg(0, 2, 10)).toBe(-5);
    expect(fanRotationDeg(1, 2, 10)).toBe(5);
  });

  it("scales up for a larger (6+ card) hand without special-casing", () => {
    const total = 6;
    const rotations = [0, 1, 2, 3, 4, 5].map((i) => fanRotationDeg(i, total));

    expect(rotations).toEqual([-15, -9, -3, 3, 9, 15]);
  });
});
