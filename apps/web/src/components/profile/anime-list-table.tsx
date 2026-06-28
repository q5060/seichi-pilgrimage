"use client";

import Link from "next/link";
import Image from "next/image";
import { PILGRIMAGE_STATUS_LABELS } from "@seichi/shared";
import type { AnimeTitles, PilgrimageStatus } from "@seichi/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAnimeDisplayTitle } from "@/hooks/use-anime-display-title";

export interface AnimeListRow {
  anilistId: number;
  titles: AnimeTitles;
  coverImage?: string | null;
  status: PilgrimageStatus;
  score?: number | null;
  review?: string | null;
  visitedSpotCount: number;
  spotCount: number;
}

function AnimeRowTitle({ titles }: { titles: AnimeTitles }) {
  const title = useAnimeDisplayTitle(titles);
  return (
    <>
      <p className="truncate font-medium group-hover:text-primary">{title}</p>
      {titles.romaji && titles.romaji !== title && (
        <p className="truncate text-xs text-muted-foreground">{titles.romaji}</p>
      )}
    </>
  );
}

function AnimeListCard({ row }: { row: AnimeListRow }) {
  const progress =
    row.spotCount > 0
      ? Math.round((row.visitedSpotCount / row.spotCount) * 100)
      : 0;

  return (
    <Link
      href={`/anime/${row.anilistId}`}
      className="group flex gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-elevated/50"
    >
      <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-elevated">
        {row.coverImage ? (
          <Image
            src={row.coverImage}
            alt=""
            fill
            className="object-cover"
            sizes="44px"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <AnimeRowTitle titles={row.titles} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="whitespace-nowrap text-xs">
            {PILGRIMAGE_STATUS_LABELS[row.status]}
          </Badge>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-elevated">
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all",
                  progress >= 100 && "bg-emerald-500"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {row.visitedSpotCount}/{row.spotCount || "—"}
            </span>
          </div>
        </div>
        {row.review && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {row.review}
          </p>
        )}
      </div>
      <div className="shrink-0 self-center text-sm font-medium text-primary">
        {row.score != null ? row.score.toFixed(1) : "—"}
      </div>
    </Link>
  );
}

export function AnimeListTable({
  rows,
  statusFilter,
}: {
  rows: AnimeListRow[];
  statusFilter?: PilgrimageStatus | "all";
}) {
  const filtered =
    statusFilter && statusFilter !== "all"
      ? rows.filter((r) => r.status === statusFilter)
      : rows;

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {statusFilter && statusFilter !== "all"
          ? "此狀態尚無作品"
          : "尚未加入任何巡禮作品"}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {filtered.map((row) => (
          <AnimeListCard key={row.anilistId} row={row} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">作品</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium">進度</th>
              <th className="px-4 py-3 font-medium text-right">評分</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const progress =
                row.spotCount > 0
                  ? Math.round((row.visitedSpotCount / row.spotCount) * 100)
                  : 0;

              return (
                <tr
                  key={row.anilistId}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-elevated/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/anime/${row.anilistId}`}
                      className="group flex items-center gap-3"
                    >
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-elevated">
                        {row.coverImage ? (
                          <Image
                            src={row.coverImage}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <AnimeRowTitle titles={row.titles} />
                        {row.review && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {row.review}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {PILGRIMAGE_STATUS_LABELS[row.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-elevated">
                        <div
                          className={cn(
                            "h-full rounded-full bg-primary transition-all",
                            progress >= 100 && "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {row.visitedSpotCount}/{row.spotCount || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-primary">
                    {row.score != null ? row.score.toFixed(1) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
