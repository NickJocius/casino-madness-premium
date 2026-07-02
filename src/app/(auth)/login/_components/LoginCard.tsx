"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { GlowButton } from "@/components/ui/GlowButton";

export function LoginCard() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    await signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-zinc-950/90 backdrop-blur-md border border-red-600/40 glow-container p-8 flex flex-col items-center gap-6">
      <div className="flex flex-col items-center">
        <h1 className="font-display text-6xl text-white glow-text-white">CASINO</h1>
        <h2 className="font-script text-4xl text-red-blood glow-text-script -mt-3">Madness</h2>
      </div>
      <p className="font-slab text-base text-azure text-center">The Dealer is waiting.</p>
      <GlowButton onClick={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? "Redirecting..." : "Sign in with Google"}
      </GlowButton>
    </div>
  );
}
