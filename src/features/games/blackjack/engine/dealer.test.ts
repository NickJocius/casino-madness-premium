import { describe, it, expect } from 'vitest';
import { dealerShouldHit } from './dealer';
import type { Card } from '@/lib/game-core/types';

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit };
}

describe('dealerShouldHit', () => {
  it('hits on 16 (9+7)', () => {
    expect(dealerShouldHit([card('9'), card('7')])).toBe(true);
  });

  it('hits on 12 (7+5)', () => {
    expect(dealerShouldHit([card('7'), card('5')])).toBe(true);
  });

  it('hits on 4 (2+2)', () => {
    expect(dealerShouldHit([card('2'), card('2')])).toBe(true);
  });

  it('stands on exactly 17 — boundary (10+7)', () => {
    expect(dealerShouldHit([card('10'), card('7')])).toBe(false);
  });

  it('stands on 18 (10+8)', () => {
    expect(dealerShouldHit([card('10'), card('8')])).toBe(false);
  });

  it('stands on 21 (A+K)', () => {
    expect(dealerShouldHit([card('A'), card('K')])).toBe(false);
  });

  it('soft-17 stands — hard-17 rule: A+6 = 17, dealer does not hit', () => {
    expect(dealerShouldHit([card('A'), card('6')])).toBe(false);
  });
});
