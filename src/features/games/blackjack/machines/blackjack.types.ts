import type { Rng } from "@/lib/game-core/rng";
import type { Card } from "@/lib/game-core/types";
import type { MoneyAmount } from "@/lib/game-core/money";
import type { PayoutOutcome } from "@/features/games/blackjack/engine/payout";

export interface BlackjackContext {
  rng: Rng;
  deck: readonly Card[];
  playerHand: readonly Card[];
  dealerHand: readonly Card[];
  bet: MoneyAmount;
  outcome: PayoutOutcome | null;
  payout: MoneyAmount | null;
}

export interface BlackjackInput {
  rng: Rng;
}

export type BlackjackEvent =
  | { type: "PLACE_BET"; amount: number /* integer cents — toMoney throws on floats */ }
  | { type: "DEAL" }
  | { type: "HIT" }
  | { type: "STAND" };
