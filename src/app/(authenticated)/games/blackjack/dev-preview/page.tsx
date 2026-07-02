import { BlackjackTable } from "@/components/game-ui/BlackjackTable";
import { PlayingCard } from "@/components/game-ui/PlayingCard";
import type { Card } from "@/lib/game-core/types";

// Scratch/visual-QA route only — throwaway mock data, not real game state.
// Will be rebuilt once wired to actual server-authoritative round state.
const dealerSlots: Array<{ card: Card | null; faceUp: boolean }> = [
  { card: { suit: "spades", rank: "K" }, faceUp: true },
  { card: null, faceUp: false },
  { card: { suit: "diamonds", rank: "6" }, faceUp: true },
];

const playerCards: Card[] = [
  { suit: "hearts", rank: "A" },
  { suit: "clubs", rank: "5" },
  { suit: "diamonds", rank: "3" },
  { suit: "spades", rank: "2" },
];

const PLAYER_FAN_ROTATIONS = [-9, -3, 3, 9];

export default function BlackjackDevPreviewPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <BlackjackTable
        dealerCards={dealerSlots.map((slot, i) => (
          <div key={i}>
            <PlayingCard card={slot.card} faceUp={slot.faceUp} size="responsive" />
          </div>
        ))}
        // null because the mock dealer hand above has a hidden hole card
        // (card: null) - this demonstrates BlackjackTable's contract: no
        // total is shown for a hand that isn't fully known yet. A real page
        // would pass null until round state is 'resolved', then a value from
        // rules.ts.
        dealerHandValue={null}
        // Mock number only - a real page computes this from the actual hand
        // via rules.ts, never inline here.
        playerHandValue={21}
        playerCards={playerCards.map((card, i) => (
          <div
            key={i}
            style={{
              marginLeft: i === 0 ? 0 : "-3cqw",
              transform: `rotate(${PLAYER_FAN_ROTATIONS[i] ?? 0}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <PlayingCard card={card} faceUp size="responsive" />
          </div>
        ))}
      />
    </div>
  );
}
