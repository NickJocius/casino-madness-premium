import { multiply, toMoney, allocate } from '@/lib/game-core/money';
import type { MoneyAmount } from '@/lib/game-core/money';

export type PayoutOutcome = 'blackjack' | 'win' | 'push' | 'loss' | 'bust';

// Returns total amount to credit the player (original bet + winnings).
// Blackjack pays 3:2; odd-cent bets round up per casino convention.
export function resolvePayout(bet: MoneyAmount, outcome: PayoutOutcome): MoneyAmount {
  switch (outcome) {
    case 'blackjack': {
      // bet × 5/2: multiply by 5, then halve via allocate to handle odd cents
      const [total] = allocate(multiply(bet, 5), [1, 1]);
      return total;
    }
    case 'win':
      return multiply(bet, 2);
    case 'push':
      return bet;
    case 'loss':
    case 'bust':
      return toMoney(0);
  }
}
