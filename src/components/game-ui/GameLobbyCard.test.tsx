import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameLobbyCard } from "./GameLobbyCard";

describe("GameLobbyCard", () => {
  it('shows the Play link with the correct href and no "Coming Soon" ribbon when not comingSoon', () => {
    render(
      <GameLobbyCard
        title="Blackjack"
        subtitle="Beat the dealer to 21."
        imageSrc="/images/casino-header.png"
        href="/games/blackjack"
      />,
    );

    const link = screen.getByRole("link", { name: "Play" });
    expect(link).toHaveAttribute("href", "/games/blackjack");
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
  });

  it('shows the "Coming Soon" ribbon and no Play link when comingSoon is true', () => {
    render(
      <GameLobbyCard
        title="Poker"
        subtitle="Five card draw."
        imageSrc="/images/casino-header.png"
        href="#"
        comingSoon
      />,
    );

    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Play" })).not.toBeInTheDocument();
  });

  it("renders the title and subtitle text", () => {
    render(
      <GameLobbyCard
        title="Slots"
        subtitle="Spin to win."
        imageSrc="/images/casino-header.png"
        href="#"
      />,
    );

    expect(screen.getByText("Slots")).toBeInTheDocument();
    expect(screen.getByText("Spin to win.")).toBeInTheDocument();
  });
});
