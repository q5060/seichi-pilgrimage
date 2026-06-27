"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/ui/motion";

interface TravelogueItem {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  publishedAt?: string | null;
  coverUrl?: string | null;
  authorName?: string;
  seriesName?: string | null;
  seriesOrder?: number | null;
}

function TravelogueSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

export function TravelogueListClient() {
  const [items, setItems] = useState<TravelogueItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (cursor?: string, append = false) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/travelogues?${params}`);
    const data = await res.json();
    const page = data.items ?? (Array.isArray(data) ? data : []);

    setItems((prev) => (append ? [...prev, ...page] : page));
    setNextCursor(data.nextCursor ?? null);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [load]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await load(nextCursor, true);
    } finally {
      setLoadingMore(false);
    }
  }

  const grouped = items.reduce<Record<string, TravelogueItem[]>>((acc, item) => {
    const key = item.seriesName?.trim() || "__ungrouped__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  for (const key of Object.keys(grouped)) {
    if (key !== "__ungrouped__") {
      grouped[key].sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0));
    }
  }

  const seriesKeys = Object.keys(grouped).filter((k) => k !== "__ungrouped__");
  const ungrouped = grouped.__ungrouped__ ?? [];

  function renderItem(t: TravelogueItem, i: number) {
    return (
      <FadeIn key={t.id} delay={Math.min(i * 0.03, 0.2)}>
        <Link href={`/travelogue/${t.slug}`}>
          <Card className="overflow-hidden transition-all hover:border-primary/30 hover:shadow-glow-sm">
            <div className="flex gap-0 sm:gap-4">
              {t.coverUrl && (
                <div className="relative hidden h-28 w-40 shrink-0 overflow-hidden sm:block">
                  <Image
                    src={t.coverUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                </div>
              )}
              <div className="flex-1 p-5">
                <h2 className="font-display text-lg font-semibold">{t.title}</h2>
                {t.publishedAt && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(t.publishedAt)}
                  </p>
                )}
                {t.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {t.excerpt}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </Link>
      </FadeIn>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8">
      <PageHeader
        title="巡禮遊記"
        description="來自社群的聖地巡禮紀錄與攻略"
        action={
          <Button asChild>
            <Link href="/travelogue/new">撰寫遊記</Link>
          </Button>
        }
      />

      {loading ? (
        <TravelogueSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="尚無遊記"
          description="成為第一個分享巡禮故事的人"
          actionLabel="撰寫遊記"
          actionHref="/travelogue/new"
        />
      ) : (
        <div className="space-y-8">
          {seriesKeys.map((series) => (
            <div key={series}>
              <h2 className="mb-3 font-display text-lg font-bold text-primary">
                系列：{series}
              </h2>
              <div className="space-y-4">
                {grouped[series].map((t, i) => renderItem(t, i))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div className="space-y-4">
              {seriesKeys.length > 0 && (
                <h2 className="font-display text-lg font-bold">其他遊記</h2>
              )}
              {ungrouped.map((t, i) => renderItem(t, i))}
            </div>
          )}
          {nextCursor && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "載入中..." : "載入更多"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
