"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { cardImageSrc, CARDBACK_SRC } from "@/lib/game-core/card-assets";
import type { Card } from "@/lib/game-core/types";

export type PlayingCardSize = "sm" | "md" | "lg";

type PlayingCardProps = {
  card: Card | null;
  faceUp: boolean;
  size?: PlayingCardSize;
};

const WIDTH_CLASSES: Record<PlayingCardSize, string> = {
  sm: "w-12",
  md: "w-20",
  lg: "w-32",
};

const IMAGE_SIZES: Record<PlayingCardSize, string> = {
  sm: "48px",
  md: "80px",
  lg: "128px",
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
