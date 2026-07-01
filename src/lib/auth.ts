import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { DEFAULT_PROFILE_BANK, DEFAULT_PROFILE_LEVEL } from "./profile-defaults";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "mysql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await prisma.$transaction(async (tx) => {
              await tx.profile.create({
                data: { userId: user.id, bank: DEFAULT_PROFILE_BANK, level: DEFAULT_PROFILE_LEVEL },
              });
              await tx.transaction.create({
                data: {
                  userId: user.id,
                  type: "PAYOUT",
                  amount: DEFAULT_PROFILE_BANK,
                  balanceAfter: DEFAULT_PROFILE_BANK,
                },
              });
            });
          } catch (error) {
            console.error(`[auth] Failed to create Profile for user ${user.id}:`, error);
          }
        },
      },
    },
  },
});
