import { setup, assign } from "xstate";
import { makeDeck, shuffle } from "@/lib/game-core/deck";
import { toMoney } from "@/lib/game-core/money";
import { isBust, isBlackjack, handValue } from "@/features/games/blackjack/engine/rules";
import { dealerShouldHit } from "@/features/games/blackjack/engine/dealer";
import { resolvePayout } from "@/features/games/blackjack/engine/payout";
import type { PayoutOutcome } from "@/features/games/blackjack/engine/payout";
import type { Card } from "@/lib/game-core/types";
import type { BlackjackContext, BlackjackEvent, BlackjackInput } from "./blackjack.types";

export const blackjackMachine = setup({
  types: {
    context: {} as BlackjackContext,
    events: {} as BlackjackEvent,
    input: {} as BlackjackInput,
  },
  guards: {
    playerBlackjack: ({ context }) => isBlackjack(context.playerHand),
    playerBust: ({ context }) => isBust(context.playerHand),
    dealerShouldContinue: ({ context }) => dealerShouldHit(context.dealerHand),
  },
  actions: {
    assignBet: assign({
      bet: ({ event }) => {
        // Safe: assignBet is only wired to PLACE_BET transitions
        const { amount } = event as Extract<BlackjackEvent, { type: "PLACE_BET" }>;
        return toMoney(amount);
      },
    }),

    dealInitialHands: assign(({ context }) => {
      const freshDeck = shuffle(makeDeck(), context.rng);
      // Alternating deal: player(0), dealer(1), player(2), dealer(3)
      return {
        deck: freshDeck.slice(4) as readonly Card[],
        playerHand: [freshDeck[0]!, freshDeck[2]!] as readonly Card[],
        dealerHand: [freshDeck[1]!, freshDeck[3]!] as readonly Card[],
      };
    }),

    drawPlayerCard: assign(({ context }) => ({
      deck: context.deck.slice(1) as readonly Card[],
      // deck[0]! is safe: a 52-card deck minus 4 dealt cards leaves 48; realistic play never exhausts it
      playerHand: [...context.playerHand, context.deck[0]!] as readonly Card[],
    })),

    drawDealerCard: assign(({ context }) => ({
      deck: context.deck.slice(1) as readonly Card[],
      // deck[0]! is safe: same assumption as drawPlayerCard
      dealerHand: [...context.dealerHand, context.deck[0]!] as readonly Card[],
    })),

    resolveOutcome: assign(({ context }) => {
      // No dealer peek: player always acts before the dealer reveals a natural.
      // If the dealer holds a blackjack when the player does not, the player's
      // full turn plays out before the dealer's hand is revealed in resolved.
      // This is a deliberate simplification — not an oversight of the peek rule.
      let outcome: PayoutOutcome;
      if (isBust(context.playerHand)) {
        outcome = "bust";
      } else if (isBlackjack(context.playerHand)) {
        // Natural: both-blackjack is a push; dealer blackjack detected here, not before playerTurn
        outcome = isBlackjack(context.dealerHand) ? "push" : "blackjack";
      } else if (isBust(context.dealerHand)) {
        outcome = "win";
      } else if (isBlackjack(context.dealerHand)) {
        // Dealer natural beats any non-natural player hand, including 3-card 21
        outcome = "loss";
      } else {
        const pv = handValue(context.playerHand);
        const dv = handValue(context.dealerHand);
        outcome = pv > dv ? "win" : pv === dv ? "push" : "loss";
      }
      return { outcome, payout: resolvePayout(context.bet, outcome) };
    }),

    clearForNextRound: assign(() => ({
      playerHand: [] as readonly Card[],
      dealerHand: [] as readonly Card[],
      outcome: null,
      payout: null,
    })),
  },
}).createMachine({
  id: "blackjack",
  initial: "idle",
  context: ({ input }) => ({
    rng: input.rng,
    deck: [] as readonly Card[],
    playerHand: [] as readonly Card[],
    dealerHand: [] as readonly Card[],
    bet: toMoney(0),
    outcome: null,
    payout: null,
  }),
  states: {
    idle: {
      on: {
        PLACE_BET: { target: "betting", actions: "assignBet" },
      },
    },
    betting: {
      on: {
        DEAL: { target: "dealing" },
      },
    },
    // Transient state: entry deals cards, always immediately advances
    dealing: {
      entry: "dealInitialHands",
      always: [{ guard: "playerBlackjack", target: "resolved" }, { target: "playerTurn" }],
    },
    playerTurn: {
      // Re-evaluated on every entry — catches bust after HIT re-enters this state
      always: [{ guard: "playerBust", target: "resolved" }],
      on: {
        // Explicit self-transition (re-entry) so always re-fires the bust check
        HIT: { target: "playerTurn", actions: "drawPlayerCard" },
        STAND: { target: "dealerTurn" },
      },
    },
    // Auto-advancing: dealer draws synchronously until dealerShouldHit returns false
    dealerTurn: {
      always: [
        { guard: "dealerShouldContinue", target: "dealerTurn", actions: "drawDealerCard" },
        { target: "resolved" },
      ],
    },
    resolved: {
      entry: "resolveOutcome",
      on: {
        PLACE_BET: {
          target: "betting",
          actions: ["clearForNextRound", "assignBet"],
        },
      },
    },
  },
});
