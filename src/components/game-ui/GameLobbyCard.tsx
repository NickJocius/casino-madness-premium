import Image from "next/image";
import Link from "next/link";

type GameLobbyCardProps = {
  title: string;
  subtitle: string;
  imageSrc: string;
  href: string;
  comingSoon?: boolean;
};

export function GameLobbyCard({
  title,
  subtitle,
  imageSrc,
  href,
  comingSoon = false,
}: GameLobbyCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white shadow-lg border border-transparent transition-all ${
        comingSoon ? "opacity-60" : "hover:-translate-y-1 hover:scale-[1.02] hover:border-red-blood"
      }`}
    >
      {comingSoon && (
        <span className="absolute top-4 -right-10 rotate-45 bg-red-blood/70 text-white font-display text-xs tracking-wide px-10 py-1 z-10 shadow-sm">
          Coming Soon
        </span>
      )}

      <div className="relative h-36 w-full">
        <Image src={imageSrc} alt={title} fill className="object-cover" />
      </div>

      <div className="p-4">
        <h3 className="font-display text-2xl text-black">{title}</h3>
        <p className="font-slab text-sm text-zinc-600">{subtitle}</p>
      </div>

      <div className="bg-gradient-to-r from-red-blood to-black px-4 py-3 flex justify-end min-h-[52px] items-center">
        {!comingSoon && (
          <Link
            href={href}
            className="rounded-full bg-black text-white font-slab text-sm px-5 py-2 hover:scale-105 transition-transform"
          >
            Play
          </Link>
        )}
      </div>
    </div>
  );
}
