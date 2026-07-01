"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

type TopNavUser = { name: string; email: string; image: string | null };

export function TopNav({ user }: { user: TopNavUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-50 bg-black border-b-2 border-red-blood">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <span className="font-display text-2xl text-white glow-text-white">Casino Madness</span>

        <div className="hidden sm:flex items-center gap-3">
          <Avatar user={user} initials={initials} />
          <span className="font-slab text-sm text-white">{user.name}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-slab text-sm text-white/70 hover:text-red-blood transition-colors"
          >
            Sign out
          </button>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((open) => !open)}
          className="sm:hidden text-white text-2xl leading-none"
        >
          ☰
        </button>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-red-blood/40 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar user={user} initials={initials} />
            <span className="font-slab text-sm text-white">{user.name}</span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-slab text-sm text-white/70 hover:text-red-blood transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

function Avatar({ user, initials }: { user: TopNavUser; initials: string }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element -- Google avatar host isn't in next.config.ts remotePatterns
    return <img src={user.image} alt="" className="h-8 w-8 rounded-full object-cover" />;
  }
  return (
    <div className="h-8 w-8 rounded-full bg-red-blood flex items-center justify-center font-slab text-xs text-white">
      {initials}
    </div>
  );
}
