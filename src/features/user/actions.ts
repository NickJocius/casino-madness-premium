"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UserActionError =
  { code: "UNAUTHENTICATED"; message: string } | { code: "PROFILE_NOT_FOUND"; message: string };

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: UserActionError };

function fail(code: UserActionError["code"], message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

export async function getBalance(): Promise<ActionResult<{ bank: number }>> {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return fail("UNAUTHENTICATED", "You must be signed in.");

  const profile = await prisma.profile.findFirst({
    where: { userId: authSession.user.id, deletedAt: null },
  });
  if (!profile) return fail("PROFILE_NOT_FOUND", "No active profile found for this account.");

  return { ok: true, data: { bank: profile.bank } };
}

export async function getProfile(): Promise<
  ActionResult<{
    city: string | null;
    state: string | null;
    bio: string | null;
    bank: number;
    level: number;
  }>
> {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) return fail("UNAUTHENTICATED", "You must be signed in.");

  const profile = await prisma.profile.findFirst({
    where: { userId: authSession.user.id, deletedAt: null },
  });
  if (!profile) return fail("PROFILE_NOT_FOUND", "No active profile found for this account.");

  return {
    ok: true,
    data: {
      city: profile.city,
      state: profile.state,
      bio: profile.bio,
      bank: profile.bank,
      level: profile.level,
    },
  };
}
