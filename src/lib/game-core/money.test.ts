import { describe, it, expect } from "vitest";
import {
  toMoney,
  toCents,
  toDisplayString,
  add,
  subtract,
  multiply,
  allocate,
  equal,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  isZero,
  isNegative,
} from "./money";

describe("toMoney / toCents", () => {
  it("round-trips integer cents without drift", () => {
    expect(toCents(toMoney(2159))).toBe(2159);
  });

  it("throws on non-integer (float dollar) input", () => {
    expect(() => toMoney(21.59)).toThrow();
  });

  it("throws on NaN input", () => {
    expect(() => toMoney(NaN)).toThrow();
  });
});

describe("add", () => {
  it("19.99 + 1.60 = exactly 21.59 (no float drift)", () => {
    expect(toCents(add(toMoney(1999), toMoney(160)))).toBe(2159);
  });
});

describe("subtract", () => {
  it("correctly subtracts", () => {
    expect(toCents(subtract(toMoney(2159), toMoney(160)))).toBe(1999);
  });

  it("allows negative results — caller enforces business rules", () => {
    expect(toCents(subtract(toMoney(100), toMoney(200)))).toBe(-100);
  });
});

describe("toDisplayString", () => {
  it("formats cents as a dollar-sign currency string", () => {
    expect(toDisplayString(toMoney(2159))).toBe("$21.59");
  });

  it("formats zero correctly", () => {
    expect(toDisplayString(toMoney(0))).toBe("$0.00");
  });

  it("formats negative amounts without throwing", () => {
    expect(toDisplayString(subtract(toMoney(100), toMoney(200)))).toBe("-$1.00");
  });

  it("inserts thousands separator correctly", () => {
    expect(toDisplayString(toMoney(100000))).toBe("$1,000.00");
  });
});

describe("multiply", () => {
  it("multiplies by an integer", () => {
    expect(toCents(multiply(toMoney(500), 3))).toBe(1500);
  });

  it("throws on float multiplier", () => {
    expect(() => multiply(toMoney(100), 1.5)).toThrow();
  });
});

describe("allocate", () => {
  it("splits a pot by ratios with no cent lost or invented", () => {
    const pot = toMoney(100);
    const [share1, share2] = allocate(pot, [1, 2]);
    expect(toCents(share1)).toBe(33);
    expect(toCents(share2)).toBe(67);
    expect(toCents(share1) + toCents(share2)).toBe(100);
  });
});

describe("comparisons", () => {
  it("equal returns true for same amount", () => {
    expect(equal(toMoney(100), toMoney(100))).toBe(true);
  });

  it("equal returns false for different amounts", () => {
    expect(equal(toMoney(100), toMoney(101))).toBe(false);
  });

  it("greaterThan returns true when greater", () => {
    expect(greaterThan(toMoney(200), toMoney(100))).toBe(true);
  });

  it("greaterThan returns false when less", () => {
    expect(greaterThan(toMoney(50), toMoney(100))).toBe(false);
  });

  it("greaterThanOrEqual returns true when equal", () => {
    expect(greaterThanOrEqual(toMoney(100), toMoney(100))).toBe(true);
  });

  it("greaterThanOrEqual returns true when greater", () => {
    expect(greaterThanOrEqual(toMoney(200), toMoney(100))).toBe(true);
  });

  it("greaterThanOrEqual returns false when less", () => {
    expect(greaterThanOrEqual(toMoney(50), toMoney(100))).toBe(false);
  });

  it("lessThan returns true when less", () => {
    expect(lessThan(toMoney(50), toMoney(100))).toBe(true);
  });

  it("isZero returns true for zero", () => {
    expect(isZero(toMoney(0))).toBe(true);
  });

  it("isZero returns false for non-zero", () => {
    expect(isZero(toMoney(1))).toBe(false);
  });

  it("isNegative returns true for negative balance", () => {
    expect(isNegative(subtract(toMoney(100), toMoney(200)))).toBe(true);
  });

  it("isNegative returns false for positive balance", () => {
    expect(isNegative(toMoney(100))).toBe(false);
  });
});
