"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useRequireAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  function requireAuth(): string | null {
    if (status === "loading") return null;
    if (!session?.user?.id) {
      router.push("/auth/signin");
      return null;
    }
    return session.user.id;
  }

  return { session, status, requireAuth, isLoggedIn: !!session?.user?.id };
}
