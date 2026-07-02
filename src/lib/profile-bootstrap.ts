import { Prisma } from "../../generated/prisma/client";
import { prisma } from "./prisma";
import { DEFAULT_PROFILE_BANK, DEFAULT_PROFILE_LEVEL } from "./profile-defaults";

export async function ensureProfile(userId: string) {
  let profile = await prisma.profile.findFirst({ where: { userId, deletedAt: null } });
  if (profile) return profile;

  try {
    profile = await prisma.$transaction(async (tx) => {
      const created = await tx.profile.create({
        data: { userId, bank: DEFAULT_PROFILE_BANK, level: DEFAULT_PROFILE_LEVEL },
      });
      await tx.transaction.create({
        data: { userId, type: "PAYOUT", amount: DEFAULT_PROFILE_BANK, balanceAfter: DEFAULT_PROFILE_BANK },
      });
      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      profile = await prisma.profile.findFirst({ where: { userId, deletedAt: null } });
    }
    if (!profile) throw error;
  }

  return profile;
}
