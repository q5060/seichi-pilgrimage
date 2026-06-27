"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import type { FeedActivityItem } from "@/lib/feed";

const ACTION_KEYS: Record<string, string> = {
  visit: "visit",
  travelogue: "travelogue",
  photo: "photo",
  spot_edit: "spotEdit",
  location_report: "locationReport",
  follow: "follow",
  route: "route",
  list: "list",
};

type FeedFilter =
  | "all"
  | "visit"
  | "travelogue"
  | "photo"
  | "location_report"
  | "route"
  | "spot_edit"
  | "follow"
  | "list";

interface FeedClientProps {
  initialItems: FeedActivityItem[];
  initialNextCursor: string | null;
}

export function FeedClient({ initialItems, initialNextCursor }: FeedClientProps) {
  const t = useTranslations("feed");
  const formatDate = useFormatDate();
  const [activities, setActivities] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const loadFeed = useCallback(async (cursor?: string, append = false, activityFilter?: FeedFilter) => {
    const params = new URLSearchParams({ type: "feed", limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const activeFilter = activityFilter ?? filter;
    if (activeFilter !== "all") params.set("activityType", activeFilter);

    const res = await fetch(`/api/social?${params}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "載入失敗");
    }

    const items = data.items ?? [];
    setActivities((prev) => (append ? [...prev, ...items] : items));
    setNextCursor(data.nextCursor ?? null);
  }, [filter]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadFeed(nextCursor, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoadingMore(false);
    }
  }

  function changeFilter(next: FeedFilter) {
    setFilter(next);
    setError(null);
    loadFeed(undefined, false, next).catch((e) => {
      setError(e instanceof Error ? e.message : "載入失敗");
    });
  }

  const displayed =
    filter === "all" ? activities : activities.filter((a) => a.type === filter);

  return (
    <PageShell variant="narrow" className="space-y-6 animate-fade-in">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      <Tabs value={filter} onValueChange={(v) => changeFilter(v as FeedFilter)}>
        <TabsList className="glass w-full flex-wrap justify-start">
          <TabsTrigger value="all">{t("filterAll")}</TabsTrigger>
          <TabsTrigger value="visit">{t("filterVisit")}</TabsTrigger>
          <TabsTrigger value="travelogue">{t("filterTravelogue")}</TabsTrigger>
          <TabsTrigger value="photo">{t("filterPhoto")}</TabsTrigger>
          <TabsTrigger value="location_report">{t("filterReport")}</TabsTrigger>
          <TabsTrigger value="route">{t("filterRoute")}</TabsTrigger>
          <TabsTrigger value="spot_edit">{t("filterSpotEdit")}</TabsTrigger>
          <TabsTrigger value="follow">{t("filterFollow")}</TabsTrigger>
          <TabsTrigger value="list">{t("filterList")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {error ? (
          <EmptyState icon={Activity} title={t("loadFailed")} description={error} />
        ) : displayed.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={t("emptyTitle")}
            description={
              filter === "all"
                ? t("emptyAll")
                : t("emptyFiltered")
            }
            actionLabel={filter === "all" ? t("exploreUsers") : undefined}
            actionHref={filter === "all" ? "/search" : undefined}
          />
        ) : (
          <>
            {displayed.map((a) => (
              <Card
                key={a.id}
                className={cn(
                  "overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-glow-sm"
                )}
              >
                <div className="flex gap-3 p-4">
                  <Link href={`/users/${a.user.id}`} className="shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={a.user.image ?? undefined} />
                      <AvatarFallback>{a.user.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">
                      <Link
                        href={`/users/${a.user.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {a.user.name ?? "巡禮者"}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        {ACTION_KEYS[a.type]
                          ? t(`actions.${ACTION_KEYS[a.type]}`)
                          : a.type}
                      </span>
                      {a.preview && (
                        <>
                          {" "}
                          <Link
                            href={a.preview.link}
                            className="font-medium text-primary hover:underline"
                          >
                            {a.preview.title}
                          </Link>
                        </>
                      )}
                    </p>
                    {a.preview?.subtitle && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {a.preview.subtitle}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>
                </div>
                {a.preview?.thumbnail && a.type !== "follow" && (
                  <Link href={a.preview.link} className="block">
                    <div className="relative aspect-video w-full overflow-hidden border-t border-border">
                      <Image
                        src={a.preview.thumbnail}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                        sizes="(max-width: 672px) 100vw, 672px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                    </div>
                  </Link>
                )}
              </Card>
            ))}
            {nextCursor && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? t("loadingMore") : t("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
