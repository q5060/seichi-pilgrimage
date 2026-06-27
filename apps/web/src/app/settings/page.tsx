"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { PushToggle } from "@/components/settings/push-toggle";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [defaultPrivacy, setDefaultPrivacy] = useState("public");
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/users/me")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        const data = await r.json();
        setName(data.user.name ?? "");
        setUsername(data.user.username ?? "");
        setBio(data.user.bio ?? "");
        setDefaultPrivacy(data.user.defaultPrivacy ?? "public");
        setShowOnLeaderboard(data.user.showOnLeaderboard ?? true);
        setImage(data.user.image ?? null);
      })
      .catch(() => setError(t("loadFailed")))
      .finally(() => setLoading(false));
  }, [status, router, t]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        username,
        bio,
        defaultPrivacy,
        showOnLeaderboard,
        image,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t("saveFailed"));
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return (
      <PageShell variant="narrow">
        <Skeleton className="mb-8 h-10 w-48" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell variant="narrow">
      <PageHeader title={t("title")} description={t("description")} />
      <Card className="glass">
        <CardContent className="p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <AvatarUpload
              name={name}
              image={image}
              fallbackImage={session?.user?.image}
              onImageChange={setImage}
            />
            <div>
              <label className="text-sm font-medium text-foreground">{t("email")}</label>
              <p className="mt-1 text-muted-foreground">{session?.user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t("name")}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t("username")}</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1.5"
                placeholder="username"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t("bio")}</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{tc("language")}</label>
              <p className="mt-1 text-xs text-muted-foreground">{t("languageHint")}</p>
              <div className="mt-2">
                <LocaleSwitcher />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">{t("defaultPrivacy")}</label>
              <select
                value={defaultPrivacy}
                onChange={(e) => setDefaultPrivacy(e.target.value)}
                className="mt-1.5 flex h-10 w-full rounded-lg border border-border bg-surface/80 px-3 text-sm"
              >
                <option value="public">{t("privacyPublic")}</option>
                <option value="followers">{t("privacyFollowers")}</option>
                <option value="private">{t("privacyPrivate")}</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-subtle bg-surface/50 p-4">
              <div>
                <p className="text-sm font-medium">{t("showOnLeaderboard")}</p>
                <p className="text-xs text-muted-foreground">{t("showOnLeaderboardHint")}</p>
              </div>
              <Switch
                checked={showOnLeaderboard}
                onCheckedChange={setShowOnLeaderboard}
              />
            </div>
            <PushToggle />
            <Button type="submit" className="w-full">
              {tc("save")}
            </Button>
            {saved && (
              <p className="text-center text-sm text-green-400">{tc("saved")}</p>
            )}
            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
