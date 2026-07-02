"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { BlackjackTable } from "@/components/game-ui/BlackjackTable";
import { PlayingCard } from "@/components/game-ui/PlayingCard";
import { GlowButton } from "@/components/ui/GlowButton";
import { fanRotationDeg } from "@/components/game-ui/card-fan";
import { handValue } from "@/features/games/blackjack/engine/rules";
import { toDisplayString, toMoney } from "@/lib/game-core/money";
import type { PayoutOutcome } from "@/features/games/blackjack/engine/payout";
import type { InProgressView, ResolvedView } from "@/features/games/blackjack/session";
import {
  useStartGame,
  usePlayerAction,
  BlackjackActionError,
  type BlackjackErrorCode,
} from "@/features/games/blackjack/queries";

const MIN_BET_CENTS = 100;
const MAX_BET_CENTS = 100_000;

const ERROR_MESSAGES: Record<BlackjackErrorCode, string> = {
  UNAUTHENTICATED: "You need to sign in to play blackjack.",
  VALIDATION_ERROR: "That bet isn't valid — please check the amount and try again.",
  PROFILE_NOT_FOUND: "We couldn't find your player profile. Try refreshing the page.",
  INSUFFICIENT_FUNDS: "You don't have enough balance for that bet.",
  SESSION_NOT_FOUND: "No active round found.",
  CONCURRENT_UPDATE:
    "Your balance changed before this could complete — likely a duplicate request from another tab or a double-click. Please refresh and try again.",
};

const OUTCOME_MESSAGES: Record<PayoutOutcome, string> = {
  blackjack: "Blackjack! You win.",
  win: "You win!",
  push: "Push — bet returned.",
  loss: "You lose.",
  bust: "Bust — you lose.",
};

function isResolved(view: InProgressView | ResolvedView): view is ResolvedView {
  return "outcome" in view;
}

export function BlackjackGameClient() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const [view, setView] = useState<InProgressView | ResolvedView | null>(null);
  const [betDollars, setBetDollars] = useState("");
  const [sessionLostModalOpen, setSessionLostModalOpen] = useState(false);

  const startGameMutation = useStartGame();
  const playerActionMutation = usePlayerAction();

  const betCents = Math.round(Number(betDollars) * 100);
  const isValidBet =
    betDollars.trim() !== "" &&
    Number.isInteger(betCents) &&
    betCents >= MIN_BET_CENTS &&
    betCents <= MAX_BET_CENTS;

  function handlePlayerAction(action: "hit" | "stand") {
    playerActionMutation.mutate(action, {
      onSuccess: (data) => setView(data),
      onError: (error) => {
        if (error instanceof BlackjackActionError && error.code === "SESSION_NOT_FOUND") {
          setSessionLostModalOpen(true);
        }
      },
    });
  }

  function acknowledgeSessionLost() {
    // KNOWN LIMITATION: mid-round state lives only in the signed cookie, never
    // persisted to DB until resolution. If the cookie is lost (expiry, clearing,
    // tamper) before resolution, the round cannot be recovered or completed - the
    // bet's Transaction row exists but the round can never resolve. Acceptable
    // for a play-money build; would need server-side round-state persistence (or
    // a reconciliation/audit path) before this could support real-money stakes.
    setSessionLostModalOpen(false);
    setView(null);
    setBetDollars("");
    // Without this, the stale SESSION_NOT_FOUND error would still sit in
    // playerActionMutation.error after the reset (TanStack Query only clears
    // a mutation's error on its own next mutate() call, not on unrelated
    // local state changes) and would re-render as inline error text on the
    // freshly-reset bet screen, undercutting the modal's own "table has been
    // reset" message.
    playerActionMutation.reset();
    startGameMutation.reset();
    queryClient.invalidateQueries({ queryKey: ["balance", userId] });
  }

  const activeError = startGameMutation.error ?? playerActionMutation.error;
  const errorMessage = activeError
    ? activeError instanceof BlackjackActionError
      ? ERROR_MESSAGES[activeError.code]
      : "Something went wrong. Please try again."
    : null;

  const dealerSlots: Array<{ card: InProgressView["dealerVisibleCard"] | null; faceUp: boolean }> =
    !view
      ? []
      : isResolved(view)
        ? view.dealerHand.map((card) => ({ card, faceUp: true }))
        : [
            { card: view.dealerVisibleCard, faceUp: true },
            { card: null, faceUp: false },
          ];

  const playerHandValue = view ? handValue(view.playerHand) : null;
  // dealerHandValue is only ever computed once the round is resolved -
  // InProgressView structurally has no full dealerHand field to pass to
  // handValue in the first place, so this can't leak the dealer's total
  // before the hole card is actually revealed.
  const dealerHandValue = view && isResolved(view) ? handValue(view.dealerHand) : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <BlackjackTable
        dealerCards={dealerSlots.map((slot, i) => (
          <div key={i}>
            <PlayingCard card={slot.card} faceUp={slot.faceUp} size="responsive" />
          </div>
        ))}
        dealerHandValue={dealerHandValue}
        playerHandValue={playerHandValue}
        playerCards={(view?.playerHand ?? []).map((card, i, arr) => (
          <div
            key={i}
            style={{
              marginLeft: i === 0 ? 0 : "-3cqw",
              transform: `rotate(${fanRotationDeg(i, arr.length)}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <PlayingCard card={card} faceUp size="responsive" />
          </div>
        ))}
      />

      {view === null && (
        <div className="flex flex-col items-center gap-4">
          {!userId ? (
            <p className="text-white">Sign in to play blackjack.</p>
          ) : (
            <>
              <label className="flex flex-col items-center gap-2 text-white">
                Bet amount
                <input
                  type="number"
                  step="0.01"
                  min={MIN_BET_CENTS / 100}
                  max={MAX_BET_CENTS / 100}
                  value={betDollars}
                  onChange={(e) => setBetDollars(e.target.value)}
                  className="rounded bg-black/40 border border-white/30 px-3 py-2 text-white text-center"
                />
              </label>
              <GlowButton
                disabled={!isValidBet || startGameMutation.isPending}
                onClick={() =>
                  startGameMutation.mutate(betCents, { onSuccess: (data) => setView(data) })
                }
              >
                {startGameMutation.isPending ? "Dealing..." : "Place Bet"}
              </GlowButton>
            </>
          )}
        </div>
      )}

      {view && !isResolved(view) && (
        <div className="flex gap-4">
          <GlowButton disabled={playerActionMutation.isPending} onClick={() => handlePlayerAction("hit")}>
            Hit
          </GlowButton>
          <GlowButton
            accent="blue"
            disabled={playerActionMutation.isPending}
            onClick={() => handlePlayerAction("stand")}
          >
            Stand
          </GlowButton>
        </div>
      )}

      {view && isResolved(view) && (
        <div className="flex flex-col items-center gap-2 text-white">
          <p className="text-xl font-display">{OUTCOME_MESSAGES[view.outcome]}</p>
          <p>{toDisplayString(toMoney(view.payout))}</p>
          <GlowButton
            onClick={() => {
              setView(null);
              setBetDollars("");
              playerActionMutation.reset();
              startGameMutation.reset();
            }}
          >
            Play Again
          </GlowButton>
        </div>
      )}

      {errorMessage && !sessionLostModalOpen && <p className="text-red-400">{errorMessage}</p>}

      {sessionLostModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-lost-message"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        >
          <div className="rounded bg-black border border-white/30 p-6 flex flex-col items-center gap-4 max-w-sm text-center text-white">
            <p id="session-lost-message">
              Your game session has expired or could not be found. Your table has been reset.
            </p>
            <GlowButton onClick={acknowledgeSessionLost}>OK</GlowButton>
          </div>
        </div>
      )}
    </div>
  );
}
