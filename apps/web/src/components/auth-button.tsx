"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-muted-foreground">載入中...</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {session.user.name}
        </span>
        <Button variant="secondary" size="sm" onClick={() => signOut()}>
          登出
        </Button>
      </div>
    );
  }

  return (
    <Button asChild size="sm">
      <Link href="/auth/signin">登入</Link>
    </Button>
  );
}
