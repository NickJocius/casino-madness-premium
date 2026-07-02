import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile-bootstrap";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  await ensureProfile(session.user.id);

  return <>{children}</>;
}
