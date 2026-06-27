"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, Film, MapPin, BookOpen } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useFormatDate } from "@/hooks/use-format-date";
import type { BookmarkListItem } from "@/lib/bookmarks-list";

const TYPE_LABELS: Record<string, string> = {
  spot: "聖地",
  travelogue: "遊記",
  anime: "作品",
  photo: "照片",
  visit: "打卡",
};

const TYPE_ICONS: Record<string, typeof MapPin> = {
  spot: MapPin,
  travelogue: BookOpen,
  anime: Film,
};

interface BookmarksClientProps {
  initialItems: BookmarkListItem[];
}

export function BookmarksClient({ initialItems }: BookmarksClientProps) {
  const formatDate = useFormatDate();
  const [items] = useState(initialItems);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all" ? items : items.filter((i) => i.targetType === filter);

  const types = [...new Set(items.map((i) => i.targetType))];

  return (
    <PageShell variant="narrow" className="animate-fade-in">
      <PageHeader title="我的收藏" description="你收藏的聖地、作品與遊記" />

      {items.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filter === "all"
                ? "bg-primary/20 text-primary"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            }`}
          >
            全部 ({items.length})
          </button>
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                filter === type
                  ? "bg-primary/20 text-primary"
                  : "bg-elevated text-muted-foreground hover:text-foreground"
              }`}
            >
              {TYPE_LABELS[type] ?? type} ({items.filter((i) => i.targetType === type).length})
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="尚無收藏"
          description="在聖地、作品或遊記頁面點擊收藏，就會顯示在這裡"
          actionLabel="探索聖地"
          actionHref="/spots"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.targetType] ?? Bookmark;
            const content = (
              <Card className="flex items-center gap-4 p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-elevated">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{item.title}</p>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {TYPE_LABELS[item.targetType] ?? item.targetType}
                    </Badge>
                  </div>
                  {item.subtitle && (
                    <p className="truncate text-sm text-muted-foreground">{item.subtitle}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </Card>
            );

            return item.href ? (
              <Link key={item.id} href={item.href}>
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
