import { describe, it, expect } from 'vitest';
import { makeDeck, shuffle } from './deck';
import { makeRng } from './rng';
import { SUITS, RANKS, type Card } from './types';

describe('makeDeck', () => {
  it('produces exactly 52 cards', () => {
    expect(makeDeck()).toHaveLength(52);
  });

  it('contains every suit/rank combination exactly once', () => {
    const deck = makeDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const matches = deck.filter(c => c.suit === suit && c.rank === rank);
        expect(matches).toHaveLength(1);
      }
    }
  });
});

describe('shuffle', () => {
  it('same seeded rng produces the same output order', () => {
    const deck = makeDeck();
    const a = shuffle(deck, makeRng('fixed'));
    const b = shuffle(deck, makeRng('fixed'));
    expect(a).toEqual(b);
  });

  it('does not mutate the input deck', () => {
    const deck = makeDeck();
    const before = [...deck];
    shuffle(deck, makeRng('mutate-check'));
    expect(deck).toEqual(before);
  });

  it('output contains the same 52 cards as the input (no drops or duplicates)', () => {
    const deck = makeDeck();
    const result = shuffle(deck, makeRng('validity'));
    const key = (c: Card) => `${c.suit}-${c.rank}`;
    expect(result).toHaveLength(52);
    expect(result.map(key).sort()).toEqual(deck.map(key).sort());
  });

  it('handles an empty deck', () => {
    expect(shuffle([], makeRng('empty'))).toEqual([]);
  });

  it('handles a single-card deck without mutation', () => {
    const single = [{ suit: 'clubs' as const, rank: 'A' as const }];
    expect(shuffle(single, makeRng('single'))).toEqual(single);
  });
});
