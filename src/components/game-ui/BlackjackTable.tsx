import Image from "next/image";
import { Children, type CSSProperties, type ReactNode } from "react";
import {
  DEALER_CARD_ZONE,
  DEALER_HAND_VALUE_ZONE,
  PLAYER_CARD_ZONE,
  PLAYER_HAND_VALUE_ZONE,
  TABLE_ASPECT_RATIO,
} from "./blackjack-table-layout";

type BlackjackTableProps = {
  dealerCards: ReactNode;
  playerCards: ReactNode;
  // The dealer's hand is only fully known once the round resolves (the hole
  // card is null/hidden until then) - null is not "loading", it's the only
  // honest value during active play. This component never computes hand
  // totals itself (that's rules.ts's job); it only renders whatever it's
  // given, and renders nothing at all when given null, so a caller can never
  // accidentally surface a total derived from a partial hand.
  dealerHandValue: number | null;
  playerHandValue: number | null;
  className?: string;
};

// Zone slots size their direct children to a card-shaped 5:7 box, capped at
// 9cqw (always ~9% of the table's own rendered width, via Tailwind's built-in
// container query units) but shrinking below that once a hand exceeds 5
// cards, via min(9cqw, 45cqw / N) where N is the live card count set on
// --bj-card-count below. At N<=5 (the common case: 2-card deal plus a hit or
// two), 45/N >= 9, so min() picks 9cqw - behavior is UNCHANGED from a fixed
// 9cqw for hands up to 5 cards. At N=6+, cards shrink proportionally instead
// of overflowing the felt (6 cards at a fixed 9cqw + gaps would run past the
// table's visible bounds). The 45cqw budget mirrors 5 x 9cqw and has not been
// visually re-verified against the source art the way DEALER_HAND_VALUE_ZONE
// was - flag for a visual check once a real 6+ card hand renders. Pass each
// card wrapped in a plain <div> (not a bare PlayingCard) so this rule has a
// dedicated element to target - a bare PlayingCard carries its own width
// class (e.g. from size="lg") that would tie with this one at equal
// specificity. Use PlayingCard size="responsive" (w-full) inside the wrapper
// to fill the slot exactly.
const CARD_SLOT_CLASSES =
  "[&>*]:w-[min(9cqw,calc(45cqw/var(--bj-card-count)))] [&>*]:aspect-[5/7]";

// @types/react's CSSProperties deliberately has no index signature (it
// extends csstype's Properties<string|number> with none, per that type's own
// doc comment - "use type assertion... to add properties or an index
// signature of your own"), so a custom property key needs the whole style
// object cast, not just the key - a lone `as string` cast on an
// already-string key is a no-op and still fails against the closed type.
function cardCountStyle(
  zone: { top: string; left: string },
  count: number,
): CSSProperties {
  return {
    top: zone.top,
    left: zone.left,
    transform: "translateX(-50%)",
    "--bj-card-count": count,
  } as CSSProperties;
}

function HandValueBadge({ value }: { value: number | null }) {
  if (value === null) {
    return null;
  }

  // Padding/font-size are cqw-relative, not fixed px, so the badge's
  // rendered HEIGHT - not just its width - stays a constant proportion of
  // the table at any viewport. A fixed-px badge here would grow into a much
  // larger fraction of a narrow table's height than a wide one, risking it
  // bleeding into the rail below PLAYER_HAND_VALUE_ZONE's clean band even
  // though its anchor point looked safe. leading-[1.2] is explicit (not left
  // to Tailwind's inherited default) because PLAYER_HAND_VALUE_ZONE's margin
  // to the rail is derived from this exact line-height - Tailwind v4's
  // Preflight sets html line-height to 1.5, which would silently make the
  // badge ~25% taller than the zone constant's math assumes.
  return (
    <div className="rounded-full border border-white/30 bg-black/50 px-[1cqw] py-[0.4cqw] text-center font-slab text-[1.4cqw] leading-[1.2] text-white/70">
      {value}
    </div>
  );
}

export function BlackjackTable({
  dealerCards,
  playerCards,
  dealerHandValue,
  playerHandValue,
  className = "",
}: BlackjackTableProps) {
  return (
    <div
      className={`relative w-full max-w-5xl mx-auto @container ${className}`.trim()}
      style={{ aspectRatio: TABLE_ASPECT_RATIO }}
    >
      <Image
        src="/images/blackjackTableSingle.png"
        alt="Blackjack table"
        fill
        priority
        sizes="(min-width: 1024px) 1024px, 100vw"
        className="object-cover"
      />

      <div
        // gap-[1.2cqw] instead of a fixed gap-3 (12px): 12px was ~1.2% of the
        // old 1024px max-w-5xl cap, so this keeps the row's total footprint
        // proportional to the table at any size instead of a fixed-px gap
        // eating a growing share of the row on narrower viewports.
        className={`absolute flex justify-center gap-[1.2cqw] ${CARD_SLOT_CLASSES}`}
        style={cardCountStyle(DEALER_CARD_ZONE, Children.count(dealerCards))}
      >
        {dealerCards}
      </div>

      <div
        className="absolute"
        style={{
          top: DEALER_HAND_VALUE_ZONE.top,
          left: DEALER_HAND_VALUE_ZONE.left,
          transform: "translateX(-50%)",
        }}
      >
        <HandValueBadge value={dealerHandValue} />
      </div>

      <div
        className={`absolute flex justify-center ${CARD_SLOT_CLASSES}`}
        style={cardCountStyle(PLAYER_CARD_ZONE, Children.count(playerCards))}
      >
        {playerCards}
      </div>

      <div
        className="absolute"
        style={{
          top: PLAYER_HAND_VALUE_ZONE.top,
          left: PLAYER_HAND_VALUE_ZONE.left,
          transform: "translateX(-50%)",
        }}
      >
        <HandValueBadge value={playerHandValue} />
      </div>
    </div>
  );
}
