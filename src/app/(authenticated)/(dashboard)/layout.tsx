import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopNav } from "@/components/layout/TopNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

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
