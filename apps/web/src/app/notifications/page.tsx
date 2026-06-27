"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useFormatDate } from "@/hooks/use-format-date";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/layout/page-shell";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notification-labels";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const formatDate = useFormatDate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string, append = false) => {
    const params = new URLSearchParams({ limit: "30" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/notifications?${params}`);
    if (!res.ok) {
      throw new Error("載入通知失敗");
    }
    const data = await res.json();
    setItems((prev) => (append ? [...prev, ...(data.items ?? [])] : data.items ?? []));
    setNextCursor(data.nextCursor ?? null);
    setError(null);
  }, []);

  useEffect(() => {
    load()
      .catch(() => setError("無法載入通知，請稍後再試"))
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

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <PageShell variant="narrow">
      <PageHeader
        title="通知"
        description="追蹤、互動、審核與成就相關的站內訊息"
        action={
          items.some((n) => !n.isRead) ? (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              全部已讀
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <NotificationSkeleton />
      ) : error ? (
        <EmptyState
          icon={Bell}
          title="載入失敗"
          description={error}
          actionLabel="重試"
          onAction={() => {
            setLoading(true);
            setError(null);
            load()
              .catch(() => setError("無法載入通知，請稍後再試"))
              .finally(() => setLoading(false));
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="尚無通知"
          description="當有人與你互動或追蹤內容有更新時，會顯示在這裡"
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Link key={n.id} href={n.link ?? "#"}>
              <Card
                className={cn(
                  "p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm",
                  !n.isRead && "border-primary/30 bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
                  </Badge>
                </div>
                {n.body && (
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(n.createdAt)}
                </p>
              </Card>
            </Link>
          ))}
          {nextCursor && (
            <div className="pt-2 text-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "載入中..." : "載入更多"}
              </Button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
