import { describe, it, expect } from "vitest";
import { cardImageSrc, CARDBACK_SRC } from "./card-assets";
import { SUITS, RANKS } from "./types";
import type { Suit, Rank } from "./types";

// Hand-written table of every suit x rank combination and its expected asset
// path. Intentionally NOT built with the same template-literal logic as the
// implementation, so a typo in card-assets.ts (e.g. wrong path prefix, missing
// extension, swapped suit/rank order) would be caught here.
const EXPECTED_PATHS: Array<[Suit, Rank, string]> = [
  // clubs
  ["clubs", "2", "/images/clubs2.png"],
  ["clubs", "3", "/images/clubs3.png"],
  ["clubs", "4", "/images/clubs4.png"],
  ["clubs", "5", "/images/clubs5.png"],
  ["clubs", "6", "/images/clubs6.png"],
  ["clubs", "7", "/images/clubs7.png"],
  ["clubs", "8", "/images/clubs8.png"],
  ["clubs", "9", "/images/clubs9.png"],
  ["clubs", "10", "/images/clubs10.png"],
  ["clubs", "J", "/images/clubsJ.png"],
  ["clubs", "Q", "/images/clubsQ.png"],
  ["clubs", "K", "/images/clubsK.png"],
  ["clubs", "A", "/images/clubsA.png"],
  // diamonds
  ["diamonds", "2", "/images/diamonds2.png"],
  ["diamonds", "3", "/images/diamonds3.png"],
  ["diamonds", "4", "/images/diamonds4.png"],
  ["diamonds", "5", "/images/diamonds5.png"],
  ["diamonds", "6", "/images/diamonds6.png"],
  ["diamonds", "7", "/images/diamonds7.png"],
  ["diamonds", "8", "/images/diamonds8.png"],
  ["diamonds", "9", "/images/diamonds9.png"],
  ["diamonds", "10", "/images/diamonds10.png"],
  ["diamonds", "J", "/images/diamondsJ.png"],
  ["diamonds", "Q", "/images/diamondsQ.png"],
  ["diamonds", "K", "/images/diamondsK.png"],
  ["diamonds", "A", "/images/diamondsA.png"],
  // hearts
  ["hearts", "2", "/images/hearts2.png"],
  ["hearts", "3", "/images/hearts3.png"],
  ["hearts", "4", "/images/hearts4.png"],
  ["hearts", "5", "/images/hearts5.png"],
  ["hearts", "6", "/images/hearts6.png"],
  ["hearts", "7", "/images/hearts7.png"],
  ["hearts", "8", "/images/hearts8.png"],
  ["hearts", "9", "/images/hearts9.png"],
  ["hearts", "10", "/images/hearts10.png"],
  ["hearts", "J", "/images/heartsJ.png"],
  ["hearts", "Q", "/images/heartsQ.png"],
  ["hearts", "K", "/images/heartsK.png"],
  ["hearts", "A", "/images/heartsA.png"],
  // spades
  ["spades", "2", "/images/spades2.png"],
  ["spades", "3", "/images/spades3.png"],
  ["spades", "4", "/images/spades4.png"],
  ["spades", "5", "/images/spades5.png"],
  ["spades", "6", "/images/spades6.png"],
  ["spades", "7", "/images/spades7.png"],
  ["spades", "8", "/images/spades8.png"],
  ["spades", "9", "/images/spades9.png"],
  ["spades", "10", "/images/spades10.png"],
  ["spades", "J", "/images/spadesJ.png"],
  ["spades", "Q", "/images/spadesQ.png"],
  ["spades", "K", "/images/spadesK.png"],
  ["spades", "A", "/images/spadesA.png"],
];

describe("card-assets", () => {
  it("has exactly one table entry per suit x rank combination (52 total)", () => {
    expect(EXPECTED_PATHS.length).toBe(SUITS.length * RANKS.length);
  });

  it.each(EXPECTED_PATHS)("cardImageSrc(%s %s) === %s", (suit, rank, expected) => {
    expect(cardImageSrc({ suit, rank })).toBe(expected);
  });

  it('exposes CARDBACK_SRC as "/images/cardback.png"', () => {
    expect(CARDBACK_SRC).toBe("/images/cardback.png");
  });
});
