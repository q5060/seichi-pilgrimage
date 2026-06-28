"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ANIME_GENRES,
  SEASON_OPTIONS,
  type BrowseTab,
} from "@/lib/anime-browse-shared";
import type { MediaSeason } from "@/lib/anilist";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TAB_LABELS: Record<BrowseTab, string> = {
  season: "本季新番",
  trending: "Trending",
  pilgrimage: "有聖地作品",
};

interface AnimeBrowseFiltersProps {
  tab: BrowseTab;
  season: MediaSeason;
  year: number;
  genre?: string;
}

function buildHref(
  tab: BrowseTab,
  season: MediaSeason,
  year: number,
  genre?: string
) {
  const params = new URLSearchParams({ tab });
  if (tab === "season") {
    params.set("season", season);
    params.set("year", String(year));
  }
  if (genre) params.set("genre", genre);
  return `/anime?${params.toString()}`;
}

export function AnimeBrowseFilters({
  tab,
  season,
  year,
  genre,
}: AnimeBrowseFiltersProps) {
  const router = useRouter();

  function navigate(updates: Partial<{ season: MediaSeason; year: number; genre: string }>) {
    const nextSeason = updates.season ?? season;
    const nextYear = updates.year ?? year;
    const nextGenre = updates.genre ?? genre;
    router.push(buildHref(tab, nextSeason, nextYear, nextGenre));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as BrowseTab[]).map((t) => (
          <Link
            key={t}
            href={buildHref(t, season, year, genre)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              tab === t
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "bg-elevated text-muted-foreground hover:text-foreground"
            )}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {tab === "season" && (
          <>
            <Select
              value={season}
              onValueChange={(v) => navigate({ season: v as MediaSeason })}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEASON_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(v) => navigate({ year: Number(v) })}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        <Select
          value={genre ?? "all"}
          onValueChange={(v) =>
            router.push(
              buildHref(tab, season, year, v === "all" ? undefined : v)
            )
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            {ANIME_GENRES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
