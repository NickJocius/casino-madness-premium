"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { cardImageSrc, CARDBACK_SRC } from "@/lib/game-core/card-assets";
import type { Card } from "@/lib/game-core/types";

export type PlayingCardSize = "sm" | "md" | "lg" | "responsive";

type PlayingCardProps = {
  card: Card | null;
  faceUp: boolean;
  size?: PlayingCardSize;
};

// "responsive" fills 100% of whatever box its parent gives it (e.g. a
// container-query-sized slot) instead of a fixed viewport-agnostic width -
// used when a layout needs the card to scale with something other than the
// viewport, such as BlackjackTable's cqw-based card slots.
const WIDTH_CLASSES: Record<PlayingCardSize, string> = {
  sm: "w-12",
  md: "w-20",
  lg: "w-32",
  responsive: "w-full",
};

const IMAGE_SIZES: Record<PlayingCardSize, string> = {
  sm: "48px",
  md: "80px",
  lg: "128px",
  // Rough upper-bound estimate: cqw can't be expressed in next/image's
  // `sizes` hint, so this just approximates the largest expected render size.
  responsive: "100px",
};

export function PlayingCard({ card, faceUp, size = "md" }: PlayingCardProps) {
  if (faceUp && card === null) {
    throw new Error(
      "PlayingCard: faceUp cannot be true when card is null (hole card contract violation)",
    );
  }

  return (
    <div className={`relative card-flip-scene aspect-[5/7] ${WIDTH_CLASSES[size]}`}>
      <motion.div
        className="card-flip-inner"
        initial={false}
        animate={{ rotateY: faceUp ? 0 : 180 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {card && (
          <div className="card-face card-face-front" aria-hidden={!faceUp}>
            <Image
              src={cardImageSrc(card)}
              alt={`${card.rank} of ${card.suit}`}
              fill
              sizes={IMAGE_SIZES[size]}
              className="object-cover"
            />
          </div>
        )}
        <div className="card-face card-face-back" aria-hidden={faceUp}>
          <Image
            src={CARDBACK_SRC}
            alt="Card back"
            fill
            sizes={IMAGE_SIZES[size]}
            className="object-cover"
          />
        </div>
      </motion.div>
    </div>
  );
}
