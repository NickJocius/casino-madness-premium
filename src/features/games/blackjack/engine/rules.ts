import type { Card, Rank } from "@/lib/game-core/types";

const RANK_VALUES: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 10,
  Q: 10,
  K: 10,
  A: 11,
};

export function handValue(cards: readonly Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    total += RANK_VALUES[card.rank];
    if (card.rank === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

export function isBust(cards: readonly Card[]): boolean {
  return handValue(cards) > 21;
}

export function isBlackjack(cards: readonly Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}
