import { describe, it, expect } from 'vitest';
import { handValue, isBust, isBlackjack } from './rules';
import type { Card } from '@/lib/game-core/types';

function card(rank: Card['rank'], suit: Card['suit'] = 'spades'): Card {
  return { rank, suit };
}

describe('handValue', () => {
  it('simple hand with no aces (10+7 = 17)', () => {
    expect(handValue([card('10'), card('7')])).toBe(17);
  });

  it('face cards count as 10 (J+Q+K = 30)', () => {
    expect(handValue([card('J'), card('Q'), card('K')])).toBe(30);
  });

  it('single Ace counts as 11 when safe (A+9 = 20)', () => {
    expect(handValue([card('A'), card('9')])).toBe(20);
  });

  it('single Ace demoted to 1 when 11 would bust (A+9+5 = 15)', () => {
    expect(handValue([card('A'), card('9'), card('5')])).toBe(15);
  });

  it('two Aces: one 11 one 1 (A+A = 12)', () => {
    expect(handValue([card('A'), card('A')])).toBe(12);
  });

  it('two Aces with 9: A+A+9 = 21', () => {
    expect(handValue([card('A'), card('A'), card('9')])).toBe(21);
  });

  it('empty hand returns 0', () => {
    expect(handValue([])).toBe(0);
  });

  it('soft 17 (A+6 = 17)', () => {
    expect(handValue([card('A'), card('6')])).toBe(17);
  });

  it('four Aces: three demoted, one stays 11 (A+A+A+A = 14)', () => {
    expect(handValue([card('A'), card('A'), card('A'), card('A')])).toBe(14);
  });
});

describe('isBust', () => {
  it('21 is not bust', () => {
    expect(isBust([card('10'), card('J'), card('A')])).toBe(false);
  });

  it('22 is bust', () => {
    expect(isBust([card('10'), card('5'), card('7')])).toBe(true);
  });

  it('ace demotion saves hand from bust (A+K+A = 12, not bust)', () => {
    expect(isBust([card('A'), card('K'), card('A')])).toBe(false);
  });
});

describe('isBlackjack', () => {
  it('Ace + King is a natural blackjack', () => {
    expect(isBlackjack([card('A'), card('K')])).toBe(true);
  });

  it('Ace + 10 is a natural blackjack', () => {
    expect(isBlackjack([card('A'), card('10')])).toBe(true);
  });

  it('3-card 21 (7+7+7) is not blackjack', () => {
    expect(isBlackjack([card('7'), card('7'), card('7')])).toBe(false);
  });

  it('20 with two cards is not blackjack', () => {
    expect(isBlackjack([card('10'), card('10')])).toBe(false);
  });
});
