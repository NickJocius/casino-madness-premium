import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "../../../generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PROFILE_BANK, DEFAULT_PROFILE_LEVEL } from "@/lib/profile-defaults";
import { TopNav } from "@/components/layout/TopNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  let profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, deletedAt: null },
  });

  if (!profile) {
    try {
      profile = await prisma.$transaction(async (tx) => {
        const created = await tx.profile.create({
          data: { userId: session.user.id, bank: DEFAULT_PROFILE_BANK, level: DEFAULT_PROFILE_LEVEL },
        });
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            type: "PAYOUT",
            amount: DEFAULT_PROFILE_BANK,
            balanceAfter: DEFAULT_PROFILE_BANK,
          },
        });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        profile = await prisma.profile.findFirst({
          where: { userId: session.user.id, deletedAt: null },
        });
      }
      if (!profile) throw error;
    }
  }

  return (
    <>
      <TopNav
        user={{
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
      />
      <main className="flex-1 bg-black">{children}</main>
    </>
  );
}
