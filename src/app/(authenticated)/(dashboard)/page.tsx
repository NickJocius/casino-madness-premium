import { NeonHeading } from "@/components/ui/NeonHeading";
import { GameLobbyCard } from "@/components/game-ui/GameLobbyCard";

const GAMES = [
  {
    title: "Blackjack",
    subtitle: "Beat the dealer to 21.",
    imageSrc: "/images/casino-header.png",
    href: "/games/blackjack",
  },
  {
    title: "Poker",
    subtitle: "Five card draw.",
    imageSrc: "/images/casino-header.png",
    href: "#",
    comingSoon: true,
  },
  {
    title: "Slots",
    subtitle: "Spin to win.",
    imageSrc: "/images/casino-header.png",
    href: "#",
    comingSoon: true,
  },
  {
    title: "Roulette",
    subtitle: "Place your bets.",
    imageSrc: "/images/casino-header.png",
    href: "#",
    comingSoon: true,
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <NeonHeading>Choose Your Game</NeonHeading>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {GAMES.map((game) => (
          <GameLobbyCard key={game.title} {...game} />
        ))}
      </div>
    </div>
  );
}
