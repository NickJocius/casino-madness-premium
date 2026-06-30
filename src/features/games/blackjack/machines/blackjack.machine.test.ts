import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { blackjackMachine } from './blackjack.machine';
import { makeRng } from '@/lib/game-core/rng';
import { toCents } from '@/lib/game-core/money';

// Tries seeds in order until one deals a non-natural opening hand.
// A natural (~4.5% probability) would skip playerTurn entirely, breaking
// tests that need to exercise HIT and STAND from playerTurn.
function reachPlayerTurn(betCents = 1000) {
  const seeds = ['hit-stand-a', 'hit-stand-b', 'hit-stand-c', 'hit-stand-d', 'hit-stand-e'];
  for (const seed of seeds) {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng(seed) } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: betCents });
    actor.send({ type: 'DEAL' });
    if (actor.getSnapshot().value === 'playerTurn') return actor;
  }
  throw new Error('All seeds produced naturals — add more seeds to reachPlayerTurn()');
}

describe('blackjack machine — basic state flow', () => {
  it('starts in idle', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('basic') } });
    actor.start();
    expect(actor.getSnapshot().value).toBe('idle');
  });

  it('PLACE_BET moves idle → betting and stores bet', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('basic') } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: 1000 });
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('betting');
    expect(toCents(snap.context.bet)).toBe(1000);
  });

  it('DEAL moves betting → playerTurn or resolved (natural)', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('basic') } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: 1000 });
    actor.send({ type: 'DEAL' });
    expect(['playerTurn', 'resolved']).toContain(actor.getSnapshot().value);
  });

  it('after DEAL both hands have exactly 2 cards', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('basic') } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: 1000 });
    actor.send({ type: 'DEAL' });
    const { playerHand, dealerHand } = actor.getSnapshot().context;
    expect(playerHand).toHaveLength(2);
    expect(dealerHand).toHaveLength(2);
  });
});

describe('blackjack machine — HIT / STAND anti-inversion', () => {
  it('HIT draws a card — playerHand grows and state does not transition to dealerTurn', () => {
    const actor = reachPlayerTurn();
    expect(actor.getSnapshot().value).toBe('playerTurn');

    actor.send({ type: 'HIT' });
    const snap = actor.getSnapshot();

    // Card was drawn (HIT, not STAND)
    expect(snap.context.playerHand).toHaveLength(3);
    // State is playerTurn (if no bust) or resolved (if bust) — never dealerTurn
    expect(snap.value).not.toBe('dealerTurn');
  });

  it('STAND does not draw a card — playerHand stays at 2 and state leaves playerTurn', () => {
    const actor = reachPlayerTurn();
    expect(actor.getSnapshot().value).toBe('playerTurn');

    actor.send({ type: 'STAND' });
    const snap = actor.getSnapshot();

    // No card drawn (STAND, not HIT)
    expect(snap.context.playerHand).toHaveLength(2);
    // State left playerTurn (either dealerTurn while dealer plays, or resolved if dealer done)
    expect(snap.value).not.toBe('playerTurn');
    expect(['dealerTurn', 'resolved']).toContain(snap.value);
  });
});

describe('blackjack machine — resolved state', () => {
  it('resolved has non-null outcome and payout', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('resolved') } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: 1000 });
    actor.send({ type: 'DEAL' });
    if (actor.getSnapshot().value === 'playerTurn') {
      actor.send({ type: 'STAND' });
    }
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('resolved');
    expect(snap.context.outcome).not.toBeNull();
    expect(snap.context.payout).not.toBeNull();
  });

  it('payout cents are non-negative for every outcome', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('resolved') } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: 1000 });
    actor.send({ type: 'DEAL' });
    if (actor.getSnapshot().value === 'playerTurn') {
      actor.send({ type: 'STAND' });
    }
    const { payout } = actor.getSnapshot().context;
    expect(toCents(payout!)).toBeGreaterThanOrEqual(0);
  });
});

describe('blackjack machine — dealer natural edge case', () => {
  it.todo(
    'dealer natural (A+K) beats non-natural player 21 (e.g. 7+7+7) — outcome is loss not push; ' +
      'requires a seed where player deals a hittable hand and dealer deals A+10-value naturally',
  );
});

describe('blackjack machine — new round', () => {
  it('PLACE_BET from resolved resets hands, outcome, and payout', () => {
    const actor = createActor(blackjackMachine, { input: { rng: makeRng('newround') } });
    actor.start();
    actor.send({ type: 'PLACE_BET', amount: 1000 });
    actor.send({ type: 'DEAL' });
    if (actor.getSnapshot().value === 'playerTurn') {
      actor.send({ type: 'STAND' });
    }
    expect(actor.getSnapshot().value).toBe('resolved');

    actor.send({ type: 'PLACE_BET', amount: 500 });
    const snap = actor.getSnapshot();
    expect(snap.value).toBe('betting');
    expect(snap.context.playerHand).toHaveLength(0);
    expect(snap.context.dealerHand).toHaveLength(0);
    expect(snap.context.outcome).toBeNull();
    expect(snap.context.payout).toBeNull();
    expect(toCents(snap.context.bet)).toBe(500);
  });
});
