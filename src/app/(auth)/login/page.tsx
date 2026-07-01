import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginCard } from "./_components/LoginCard";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <LoginCard />
    </main>
  );
}
