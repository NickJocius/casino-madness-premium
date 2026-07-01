"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { NeonHeading } from "@/components/ui/NeonHeading";
import { GlowButton } from "@/components/ui/GlowButton";

export function LoginCard() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    await signIn.social({ provider: "google", callbackURL: "/dashboard" });
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 flex flex-col items-center gap-6">
      <NeonHeading>Casino Madness</NeonHeading>
      <p className="font-slab text-black text-center">The Dealer is waiting.</p>
      <GlowButton onClick={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? "Redirecting..." : "Sign in with Google"}
      </GlowButton>
    </div>
  );
}
