"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { startGame, playerAction } from "./actions";
import type { ActionResult } from "./actions";
import type { InProgressView, ResolvedView } from "./session";

// BlackjackActionError isn't exported from actions.ts, so its shape is
// derived structurally from ActionResult's failure branch instead of
// duplicating the literal code union here.
type BlackjackErrorShape = Extract<ActionResult<unknown>, { ok: false }>["error"];
export type BlackjackErrorCode = BlackjackErrorShape["code"];

// Mirrors the useBalance/useProfile "throw on !result.ok" convention (see
// src/features/user/queries.ts) so TanStack Query's native error state
// populates, but preserves the typed `code` - not just `message` - via a
// custom Error subclass so callers can branch on it for distinct copy.
export class BlackjackActionError extends Error {
  constructor(
    public readonly code: BlackjackErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BlackjackActionError";
  }
}

function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new BlackjackActionError(result.error.code, result.error.message);
  }
  return result.data;
}

export function useStartGame() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (betCents: number): Promise<InProgressView | ResolvedView> =>
      // startGame's input contract is a BARE NUMBER (bet cents), not { bet }.
      startGame(betCents).then(unwrap),
    onSuccess: () => {
      // startGame always debits the bet from bank immediately, and may also
      // credit an immediate payout (natural blackjack) - balance always
      // changes on success here.
      queryClient.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });
}

export function usePlayerAction() {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: "hit" | "stand"): Promise<InProgressView | ResolvedView> =>
      // playerAction's input contract is a BARE STRING "hit" | "stand".
      playerAction(action).then(unwrap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balance", userId] });
    },
  });
}
