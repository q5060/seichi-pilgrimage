"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FadeIn } from "@/components/ui/motion";
import { isDevLoginUiEnabled } from "@/lib/dev-auth";

const devLoginEnabled = isDevLoginUiEnabled();

export default function SignInPage() {
  const [email, setEmail] = useState(devLoginEnabled ? "demo@seichi.local" : "");
  const [name, setName] = useState(devLoginEnabled ? "巡禮測試者" : "");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4">
      <FadeIn className="w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          登入聖地巡禮
        </h1>
        <p className="mt-2 text-muted-foreground">
          使用 Google、Discord 或開發用帳號登入
        </p>
      </FadeIn>

      <FadeIn delay={0.1} className="mt-8 w-full max-w-md">
        <Card className="glass shadow-glow-sm">
          <CardContent className="space-y-4 p-6">
            <Button
              variant="outline"
              className="w-full border-border"
              onClick={() => signIn("google")}
            >
              使用 Google 登入
            </Button>
            <Button
              variant="outline"
              className="w-full border-border"
              onClick={() => signIn("discord")}
            >
              使用 Discord 登入
            </Button>

            {!devLoginEnabled ? null : (
              <>
                <div className="relative py-2">
                  <Separator className="bg-white/10" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    開發用
                  </span>
                </div>

                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="border-border bg-surface"
                />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="顯示名稱"
                  className="border-border bg-surface"
                />
                <Button
                  className="w-full"
                  onClick={() =>
                    signIn("credentials", { email, name, callbackUrl: "/" })
                  }
                >
                  開發用登入
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
