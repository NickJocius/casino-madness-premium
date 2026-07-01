"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { getBalance, getProfile } from "./actions";

export function useBalance() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["balance", userId],
    queryFn: async () => {
      const result = await getBalance();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!userId,
  });
}

export function useProfile() {
  const { data: session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const result = await getProfile();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!userId,
  });
}
