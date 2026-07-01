import type { Card } from "@/lib/game-core/types";
import { handValue } from "./rules";

// Hard-17 rule: dealer stands on all 17s (hard and soft).
// Soft-17-hits variant is intentionally excluded.
export function dealerShouldHit(cards: readonly Card[]): boolean {
  return handValue(cards) <= 16;
}
