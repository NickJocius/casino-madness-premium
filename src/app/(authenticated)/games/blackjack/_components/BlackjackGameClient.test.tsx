import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { BlackjackGameClient } from "./BlackjackGameClient";
import { useSession } from "@/lib/auth-client";
import { startGame, playerAction } from "@/features/games/blackjack/actions";
import { handValue } from "@/features/games/blackjack/engine/rules";
import { toDisplayString, toMoney } from "@/lib/game-core/money";
import type { Card } from "@/lib/game-core/types";
import type { InProgressView, ResolvedView } from "@/features/games/blackjack/session";
import type { BlackjackErrorCode } from "@/features/games/blackjack/queries";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const rest = { ...props };
    delete rest.fill;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- test stub standing in for next/image
    return <img {...rest} />;
  },
}));

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/features/games/blackjack/actions", () => ({
  startGame: vi.fn(),
  playerAction: vi.fn(),
}));

const USER_ID = "user-1";

// The mocked startGame/playerAction's declared return type (inferred from the
// real module's exports, not this mock factory) is Promise<ActionResult<...>>
// - deriving the resolved shape this way keeps the fixtures in sync with that
// type without re-declaring ActionResult's non-exported error union by hand.
type StartGameResolved = Awaited<ReturnType<typeof startGame>>;

function ok(data: InProgressView | ResolvedView): StartGameResolved {
  return { ok: true, data };
}

function fail(code: BlackjackErrorCode, message = "error"): StartGameResolved {
  return { ok: false, error: { code, message } };
}

function mockSignedIn() {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: USER_ID } },
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useSession>);
}

function mockSignedOut() {
  vi.mocked(useSession).mockReturnValue({
    data: null,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useSession>);
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { ...utils, queryClient };
}

// The two card-zone wrapper divs in BlackjackTable are the only elements in
// the tree carrying all three of these literal Tailwind tokens together
// (dealer zone first in DOM order, then player zone) - see
// BlackjackTable.tsx's CARD_SLOT_CLASSES/zone divs. Each zone's hand-value
// badge wrapper is its next sibling.
function getZones(container: HTMLElement) {
  const zones = container.querySelectorAll(".absolute.flex.justify-center");
  const dealerCardsZone = zones[0] as HTMLElement;
  const playerCardsZone = zones[1] as HTMLElement;
  return {
    dealerCardsZone,
    dealerValueZone: dealerCardsZone.nextElementSibling as HTMLElement,
    playerCardsZone,
    playerValueZone: playerCardsZone.nextElementSibling as HTMLElement,
  };
}

const TEN_HEARTS: Card = { suit: "hearts", rank: "10" };
const SEVEN_SPADES: Card = { suit: "spades", rank: "7" };
const KING_CLUBS: Card = { suit: "clubs", rank: "K" };
const ACE_DIAMONDS: Card = { suit: "diamonds", rank: "A" };
const FIVE_HEARTS: Card = { suit: "hearts", rank: "5" };

function inProgress(overrides: Partial<InProgressView> = {}): InProgressView {
  return {
    playerHand: [TEN_HEARTS, SEVEN_SPADES],
    dealerVisibleCard: KING_CLUBS,
    currentState: "playerTurn",
    balance: 9500,
    ...overrides,
  };
}

function resolvedView(overrides: Partial<ResolvedView> = {}): ResolvedView {
  return {
    playerHand: [TEN_HEARTS, ACE_DIAMONDS],
    dealerHand: [KING_CLUBS, SEVEN_SPADES],
    outcome: "blackjack",
    payout: 750,
    newBalance: 10250,
    ...overrides,
  };
}

async function placeBet(user: ReturnType<typeof userEvent.setup>, betDollars = "5.00") {
  fireEvent.change(screen.getByLabelText("Bet amount"), { target: { value: betDollars } });
  await user.click(screen.getByRole("button", { name: "Place Bet" }));
}

beforeEach(() => {
  vi.resetAllMocks();
  mockSignedIn();
});

describe("BlackjackGameClient", () => {
  describe("bet screen", () => {
    it("renders the bet screen by default (no active round)", () => {
      renderWithProviders(<BlackjackGameClient />);

      expect(screen.getByLabelText("Bet amount")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Place Bet" })).toBeInTheDocument();
    });

    it.each([
      ["", true],
      ["0", true],
      ["-5", true],
      ["0.50", true],
      ["1000.01", true],
      ["1.00", false],
      ["1000", false],
    ])("with bet input %j, Place Bet disabled=%s", (value, expectedDisabled) => {
      renderWithProviders(<BlackjackGameClient />);

      fireEvent.change(screen.getByLabelText("Bet amount"), { target: { value } });
      const button = screen.getByRole("button", { name: "Place Bet" });

      if (expectedDisabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).toBeEnabled();
      }
    });

    it("shows a sign-in message instead of the bet form when unauthenticated", () => {
      mockSignedOut();
      renderWithProviders(<BlackjackGameClient />);

      expect(screen.getByText("Sign in to play blackjack.")).toBeInTheDocument();
      expect(screen.queryByLabelText("Bet amount")).toBeNull();
      expect(screen.queryByRole("button", { name: "Place Bet" })).toBeNull();
    });
  });

  describe("placing a bet", () => {
    it("calls startGame with a bare number of cents, not an object", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user, "5.00");

      expect(startGame).toHaveBeenCalledWith(500);
    });

    it("invalidates the balance query cache key on a successful startGame", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      const user = userEvent.setup();
      const { queryClient } = renderWithProviders(<BlackjackGameClient />);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await placeBet(user);

      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["balance", USER_ID] }),
      );
    });

    it("renders exactly one face-up and one face-down dealer slot, with no dealer hand-value badge, for an in-progress response", async () => {
      const view = inProgress();
      vi.mocked(startGame).mockResolvedValue(ok(view));
      const user = userEvent.setup();
      const { container } = renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);

      await waitFor(() => expect(getZones(container).dealerCardsZone.children).toHaveLength(2));

      const { dealerCardsZone, dealerValueZone, playerValueZone } = getZones(container);
      expect(within(dealerCardsZone).getByAltText("K of clubs")).toBeInTheDocument();
      // Both slots render a "Card back" image element (PlayingCard always mounts
      // the back face regardless of faceUp - only aria-hidden toggles), so there
      // are 2 total: the hidden slot's own back, and the visible card's own
      // (aria-hidden) back face.
      expect(within(dealerCardsZone).getAllByAltText("Card back")).toHaveLength(2);
      expect(dealerValueZone).toBeEmptyDOMElement();
      expect(playerValueZone).toHaveTextContent(String(handValue(view.playerHand)));
    });

    it("renders a full dealer reveal, outcome/payout text, and Play Again (no Hit/Stand) when startGame resolves immediately (natural blackjack)", async () => {
      const view = resolvedView({
        dealerHand: [KING_CLUBS, SEVEN_SPADES, FIVE_HEARTS],
        outcome: "blackjack",
        payout: 750,
      });
      vi.mocked(startGame).mockResolvedValue(ok(view));
      const user = userEvent.setup();
      const { container } = renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);

      await waitFor(() => screen.getByText("Blackjack! You win."));

      expect(getZones(container).dealerCardsZone.children).toHaveLength(view.dealerHand.length);
      expect(screen.getByText(toDisplayString(toMoney(view.payout)))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Play Again" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Hit" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Stand" })).toBeNull();
    });

    it.each([
      ["UNAUTHENTICATED", "You need to sign in to play blackjack."],
      ["VALIDATION_ERROR", "That bet isn't valid — please check the amount and try again."],
      ["PROFILE_NOT_FOUND", "We couldn't find your player profile. Try refreshing the page."],
      ["INSUFFICIENT_FUNDS", "You don't have enough balance for that bet."],
      ["SESSION_NOT_FOUND", "No active round found."],
      [
        "CONCURRENT_UPDATE",
        "Your balance changed before this could complete — likely a duplicate request from another tab or a double-click. Please refresh and try again.",
      ],
    ] satisfies Array<[BlackjackErrorCode, string]>)(
      "shows the mapped message for a startGame %s rejection, and never opens the session-lost modal",
      async (code, message) => {
        vi.mocked(startGame).mockResolvedValue(fail(code));
        const user = userEvent.setup();
        renderWithProviders(<BlackjackGameClient />);

        await placeBet(user);

        await waitFor(() => screen.getByText(message));
        expect(screen.getByText(message)).toHaveClass("text-red-400");
        expect(screen.queryByRole("button", { name: "OK" })).toBeNull();
        expect(
          screen.queryByText(
            "Your game session has expired or could not be found. Your table has been reset.",
          ),
        ).toBeNull();
      },
    );

    it("shows the generic fallback message when startGame rejects with a plain Error (not BlackjackActionError)", async () => {
      vi.mocked(startGame).mockRejectedValue(new Error("boom"));
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);

      await waitFor(() => screen.getByText("Something went wrong. Please try again."));
    });
  });

  describe("player actions", () => {
    it('calls playerAction with the bare string "hit" when Hit is clicked', async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      vi.mocked(playerAction).mockResolvedValue(
        ok(inProgress({ playerHand: [TEN_HEARTS, SEVEN_SPADES, FIVE_HEARTS] })),
      );
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      await user.click(screen.getByRole("button", { name: "Hit" }));

      expect(playerAction).toHaveBeenCalledWith("hit");
    });

    it('calls playerAction with the bare string "stand" when Stand is clicked', async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      vi.mocked(playerAction).mockResolvedValue(ok(resolvedView()));
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Stand" }));
      await user.click(screen.getByRole("button", { name: "Stand" }));

      expect(playerAction).toHaveBeenCalledWith("stand");
    });

    it("disables both Hit and Stand while a player-action mutation is pending", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      let resolveAction!: (value: StartGameResolved) => void;
      const pending = new Promise<StartGameResolved>((resolve) => {
        resolveAction = resolve;
      });
      vi.mocked(playerAction).mockReturnValue(pending);
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));

      const hitButton = screen.getByRole("button", { name: "Hit" });
      const standButton = screen.getByRole("button", { name: "Stand" });
      await user.click(hitButton);

      expect(hitButton).toBeDisabled();
      expect(standButton).toBeDisabled();

      resolveAction(ok(inProgress({ playerHand: [TEN_HEARTS, SEVEN_SPADES, FIVE_HEARTS] })));

      await waitFor(() => expect(screen.getByRole("button", { name: "Hit" })).not.toBeDisabled());
    });

    it("grows the player hand and updates its value badge on a Hit that stays in-progress, while the dealer zone still shows exactly 1 face-up + 1 hidden slot with no dealer badge", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      const nextView = inProgress({ playerHand: [TEN_HEARTS, SEVEN_SPADES, FIVE_HEARTS] });
      vi.mocked(playerAction).mockResolvedValue(ok(nextView));
      const user = userEvent.setup();
      const { container } = renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      await user.click(screen.getByRole("button", { name: "Hit" }));

      await waitFor(() => expect(getZones(container).playerCardsZone.children).toHaveLength(3));

      const { dealerCardsZone, dealerValueZone, playerValueZone } = getZones(container);
      expect(dealerCardsZone.children).toHaveLength(2);
      expect(within(dealerCardsZone).getByAltText("K of clubs")).toBeInTheDocument();
      expect(dealerValueZone).toBeEmptyDOMElement();
      expect(playerValueZone).toHaveTextContent(String(handValue(nextView.playerHand)));
    });

    it("reveals the full dealer hand and its real value on a Stand that resolves the round, hides Hit/Stand, and resets to the bet screen on Play Again", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      const finalView = resolvedView({
        dealerHand: [KING_CLUBS, SEVEN_SPADES, FIVE_HEARTS],
        outcome: "win",
        payout: 1000,
      });
      vi.mocked(playerAction).mockResolvedValue(ok(finalView));
      const user = userEvent.setup();
      const { container } = renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Stand" }));
      await user.click(screen.getByRole("button", { name: "Stand" }));

      await waitFor(() => screen.getByText("You win!"));

      const { dealerCardsZone, dealerValueZone } = getZones(container);
      expect(dealerCardsZone.children).toHaveLength(finalView.dealerHand.length);
      expect(dealerValueZone).toHaveTextContent(String(handValue(finalView.dealerHand)));
      expect(screen.queryByRole("button", { name: "Hit" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Stand" })).toBeNull();

      await user.click(screen.getByRole("button", { name: "Play Again" }));

      expect(screen.getByLabelText("Bet amount")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Play Again" })).toBeNull();
    });

    it("clears any lingering inline mutation error when Play Again resets to the bet screen", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      // First Hit rejects with a non-session error (inline text, no modal);
      // the second Hit (after the user retries) resolves the round outright.
      vi.mocked(playerAction)
        .mockResolvedValueOnce(fail("CONCURRENT_UPDATE"))
        .mockResolvedValueOnce(ok(resolvedView({ outcome: "bust", payout: 0 })));
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      await user.click(screen.getByRole("button", { name: "Hit" }));

      await waitFor(() =>
        screen.getByText(
          "Your balance changed before this could complete — likely a duplicate request from another tab or a double-click. Please refresh and try again.",
        ),
      );

      await user.click(screen.getByRole("button", { name: "Hit" }));
      await waitFor(() => screen.getByText("Bust — you lose."));

      await user.click(screen.getByRole("button", { name: "Play Again" }));

      await waitFor(() => expect(screen.getByLabelText("Bet amount")).toBeInTheDocument());
      expect(document.body).not.toHaveTextContent(
        "Your balance changed before this could complete",
      );
      expect(screen.queryByText("Bust — you lose.")).toBeNull();
    });

    it("invalidates the balance query cache key on a successful resolving Stand", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      vi.mocked(playerAction).mockResolvedValue(ok(resolvedView()));
      const user = userEvent.setup();
      const { queryClient } = renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Stand" }));

      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      await user.click(screen.getByRole("button", { name: "Stand" }));

      await waitFor(() =>
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["balance", USER_ID] }),
      );
    });

    it("opens the blocking session-lost modal (not inline text) when playerAction rejects with SESSION_NOT_FOUND, and resets to the bet screen + invalidates balance on OK", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      vi.mocked(playerAction).mockResolvedValue(fail("SESSION_NOT_FOUND", "No active round found."));
      const user = userEvent.setup();
      const { queryClient } = renderWithProviders(<BlackjackGameClient />);
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      await user.click(screen.getByRole("button", { name: "Hit" }));

      await waitFor(() =>
        screen.getByText(
          "Your game session has expired or could not be found. Your table has been reset.",
        ),
      );
      // Inline error paragraph must be suppressed while the modal is open.
      expect(screen.queryByText("No active round found.")).toBeNull();

      await user.click(screen.getByRole("button", { name: "OK" }));

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["balance", USER_ID] });
      await waitFor(() => expect(screen.getByLabelText("Bet amount")).toBeInTheDocument());
      expect(
        screen.queryByText(
          "Your game session has expired or could not be found. Your table has been reset.",
        ),
      ).toBeNull();
    });

    // Regression test: playerActionMutation.error previously survived
    // acknowledgeSessionLost (only local `view`/`betDollars` state was reset,
    // not the mutation itself), so the stale SESSION_NOT_FOUND message could
    // re-surface as inline error text under the freshly-reset bet screen and
    // then under a brand-new, successfully-dealt round - even though nothing
    // is actually wrong with the new round.
    it("never shows the stale SESSION_NOT_FOUND inline error text after dismissing the session-lost modal and placing a new bet", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      vi.mocked(playerAction).mockResolvedValue(fail("SESSION_NOT_FOUND", "No active round found."));
      const user = userEvent.setup();
      renderWithProviders(<BlackjackGameClient />);

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      await user.click(screen.getByRole("button", { name: "Hit" }));

      await waitFor(() =>
        screen.getByText(
          "Your game session has expired or could not be found. Your table has been reset.",
        ),
      );

      await user.click(screen.getByRole("button", { name: "OK" }));

      // Immediately after dismissal, back on the bet screen - no stale inline
      // error text anywhere, even though playerActionMutation was never
      // called again.
      await waitFor(() => expect(screen.getByLabelText("Bet amount")).toBeInTheDocument());
      expect(document.body).not.toHaveTextContent("No active round found.");

      // Placing a brand-new bet (a different mutation, startGameMutation)
      // succeeds normally - the old playerActionMutation error must still
      // not resurface anywhere in the document.
      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      expect(document.body).not.toHaveTextContent("No active round found.");
    });
  });

  describe("security: dealer hole card never leaks while in progress", () => {
    it("shows no dealer hand-value badge and never more than 2 dealer card slots across a bet followed by two hits (still in-progress)", async () => {
      vi.mocked(startGame).mockResolvedValue(ok(inProgress()));
      vi.mocked(playerAction)
        .mockResolvedValueOnce(
          ok(inProgress({ playerHand: [TEN_HEARTS, SEVEN_SPADES, FIVE_HEARTS] })),
        )
        .mockResolvedValueOnce(
          ok(inProgress({ playerHand: [TEN_HEARTS, SEVEN_SPADES, FIVE_HEARTS, ACE_DIAMONDS] })),
        );
      const user = userEvent.setup();
      const { container } = renderWithProviders(<BlackjackGameClient />);

      function assertNoDealerLeak() {
        const { dealerCardsZone, dealerValueZone } = getZones(container);
        expect(dealerValueZone).toBeEmptyDOMElement();
        expect(dealerCardsZone.children.length).toBeLessThanOrEqual(2);
      }

      // Bet screen, before any round exists.
      assertNoDealerLeak();

      await placeBet(user);
      await waitFor(() => screen.getByRole("button", { name: "Hit" }));
      assertNoDealerLeak();

      await user.click(screen.getByRole("button", { name: "Hit" }));
      await waitFor(() => expect(getZones(container).playerCardsZone.children).toHaveLength(3));
      assertNoDealerLeak();

      await user.click(screen.getByRole("button", { name: "Hit" }));
      await waitFor(() => expect(getZones(container).playerCardsZone.children).toHaveLength(4));
      assertNoDealerLeak();
    });
  });
});
