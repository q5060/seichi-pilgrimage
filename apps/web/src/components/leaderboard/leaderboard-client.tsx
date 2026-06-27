"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, MapPin, Globe, Medal } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import type { LeaderboardItem, LeaderboardType } from "@/lib/leaderboard";

const TABS: {
  id: LeaderboardType;
  label: string;
  icon: typeof Trophy;
  unit: string;
}[] = [
  { id: "contribution", label: "貢獻分", icon: Trophy, unit: "分" },
  { id: "visits", label: "打卡數", icon: MapPin, unit: "次" },
  { id: "prefectures", label: "都道府縣", icon: Globe, unit: "縣" },
];

const RANK_STYLES: Record<number, string> = {
  1: "text-medal-gold",
  2: "text-medal-silver",
  3: "text-medal-bronze",
};

interface LeaderboardClientProps {
  initialType: LeaderboardType;
  initialItems: LeaderboardItem[];
}

export function LeaderboardClient({ initialType, initialItems }: LeaderboardClientProps) {
  const [type, setType] = useState<LeaderboardType>(initialType);
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (type === initialType) {
      setItems(initialItems);
      return;
    }
    setLoading(true);
    fetch(`/api/leaderboard?type=${type}`)
      .then((r) => r.json())
      .then((data) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [type, initialType, initialItems]);

  const activeTab = TABS.find((t) => t.id === type)!;

  return (
    <PageShell variant="narrow" className="space-y-6 animate-fade-in">
      <PageHeader
        title="排行榜"
        description="巡禮社群的貢獻與足跡排名（可在設定中選擇是否顯示）"
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setType(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all",
                type === tab.id
                  ? "border-primary/20 bg-primary/15 text-primary shadow-glow-sm"
                  : "border-transparent bg-elevated text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">載入中...</p>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">尚無排名資料</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={`/users/${item.id}`}>
              <Card
                className={cn(
                  "flex items-center gap-4 p-4 transition-all hover:border-primary/25 hover:shadow-glow-sm",
                  item.rank <= 3 && "border-primary/20 bg-surface/30",
                  item.rank % 2 === 0 && item.rank > 3 && "bg-surface/20"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center font-display text-lg font-bold",
                    RANK_STYLES[item.rank] ?? "text-muted-foreground"
                  )}
                >
                  {item.rank <= 3 ? <Medal className="h-6 w-6" /> : item.rank}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={item.image ?? undefined} />
                  <AvatarFallback>{item.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name ?? "巡禮者"}</p>
                  {item.username && (
                    <p className="truncate text-xs text-muted-foreground">@{item.username}</p>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {item.score} {activeTab.unit}
                </Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
