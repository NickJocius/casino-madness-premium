import { describe, it, expect } from "vitest";
import { resolvePayout } from "./payout";
import { toMoney, toCents } from "@/lib/game-core/money";

describe("resolvePayout", () => {
  const bet10 = toMoney(1000); // $10.00

  it("blackjack pays 3:2 — $10 bet returns $25", () => {
    expect(toCents(resolvePayout(bet10, "blackjack"))).toBe(2500);
  });

  it("win pays 1:1 — $10 bet returns $20", () => {
    expect(toCents(resolvePayout(bet10, "win"))).toBe(2000);
  });

  it("push returns the original bet — $10 bet returns $10", () => {
    expect(toCents(resolvePayout(bet10, "push"))).toBe(1000);
  });

  it("loss returns nothing — $10 bet returns $0", () => {
    expect(toCents(resolvePayout(bet10, "loss"))).toBe(0);
  });

  it("bust returns nothing — $10 bet returns $0", () => {
    expect(toCents(resolvePayout(bet10, "bust"))).toBe(0);
  });

  it("blackjack 3:2 is exact for $1 bet — 100 cents returns 250 cents", () => {
    expect(toCents(resolvePayout(toMoney(100), "blackjack"))).toBe(250);
  });

  it("blackjack on $0 bet returns $0", () => {
    expect(toCents(resolvePayout(toMoney(0), "blackjack"))).toBe(0);
  });

  it("blackjack on odd-cent bet rounds up — 3 cent bet returns 8 cents", () => {
    expect(toCents(resolvePayout(toMoney(3), "blackjack"))).toBe(8);
  });
});
