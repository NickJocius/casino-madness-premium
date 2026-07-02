import type { Card } from "./types";

export const CARDBACK_SRC = "/images/cardback.png";

export function cardImageSrc(card: Card): string {
  return `/images/${card.suit}${card.rank}.png`;
}
