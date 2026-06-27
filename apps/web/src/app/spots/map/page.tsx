"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PREFECTURES } from "@seichi/shared";
import { MapPin, SlidersHorizontal, Film, AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { FilterSidebar, FilterLink } from "@/components/ui/filter-sidebar";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { ExploreMap, type MapMarker } from "@/components/map/explore-map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAnimeDisplayTitle } from "@/hooks/use-anime-display-title";

interface AnimeOption {
  id?: number;
  anilistId?: number;
  titles?: { native?: string; romaji?: string; chinese?: string };
  title?: { native?: string; romaji?: string };
}

function MapAnimeFilterBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1">
      <Film className="h-3 w-3" />
      {children}
    </Badge>
  );
}

function AnimeFilterTitle({ option }: { option: AnimeOption }) {
  const title = useAnimeDisplayTitle(option.titles ?? option.title ?? {});
  return <span className="truncate font-medium">{title}</span>;
}

export default function SpotsMapPage() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefecture, setPrefecture] = useState("all");
  const [visitedOnly, setVisitedOnly] = useState(false);
  const [bounds, setBounds] = useState<string | null>(null);
  const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoundsRef = useRef<string | null>(null);
  const [animeQuery, setAnimeQuery] = useState("");
  const [animeOptions, setAnimeOptions] = useState<AnimeOption[]>([]);
  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [selectedAnimeOption, setSelectedAnimeOption] = useState<AnimeOption | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("prefecture");
    if (p && (PREFECTURES as readonly string[]).includes(p)) {
      setPrefecture(p);
    }
  }, []);

  const searchAnime = useCallback(async (q: string) => {
    if (!q.trim()) {
      setAnimeOptions([]);
      return;
    }
    const params = new URLSearchParams({ type: "anime", q, limit: "8" });
    const res = await fetch(`/api/search?${params}`);
    const data = await res.json();
    setAnimeOptions(data.anime ?? []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchAnime(animeQuery), 300);
    return () => clearTimeout(timer);
  }, [animeQuery, searchAnime]);

  const handleBoundsChange = useCallback((nextBounds: string) => {
    if (nextBounds === lastBoundsRef.current) return;
    if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
    boundsDebounceRef.current = setTimeout(() => {
      lastBoundsRef.current = nextBounds;
      setBounds(nextBounds);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
    };
  }, []);

  const fetchMarkers = useCallback(async () => {
    if (!bounds) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (prefecture !== "all") params.set("prefecture", prefecture);
    if (visitedOnly) params.set("visited", "true");
    if (anilistId != null) params.set("anilistId", String(anilistId));
    params.set("bounds", bounds);

    try {
      const res = await fetch(`/api/spots/map?${params}`);
      if (!res.ok) throw new Error("載入失敗");
      const data = await res.json();
      setMarkers(data.markers ?? []);
    } catch {
      setMarkers([]);
      setError("地圖資料載入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [prefecture, visitedOnly, bounds, anilistId]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  function selectAnime(option: AnimeOption) {
    const id = option.anilistId ?? option.id;
    if (!id) return;
    setAnilistId(id);
    setSelectedAnimeOption(option);
    setAnimeQuery("");
    setAnimeOptions([]);
  }

  function clearAnimeFilter() {
    setAnilistId(null);
    setSelectedAnimeOption(null);
    setAnimeQuery("");
    setAnimeOptions([]);
  }

  const filterSections = useMemo(
    () => [
      {
        title: "作品",
        children: (
          <div className="space-y-2 px-1">
            {anilistId != null && selectedAnimeOption ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <AnimeFilterTitle option={selectedAnimeOption} />
                <button
                  type="button"
                  onClick={clearAnimeFilter}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  清除
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="搜尋作品..."
                  value={animeQuery}
                  onChange={(e) => setAnimeQuery(e.target.value)}
                  className="h-9"
                />
                {animeOptions.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                    {animeOptions.map((a) => {
                      const id = a.anilistId ?? a.id;
                      if (!id) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => selectAnime(a)}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-elevated"
                        >
                          <AnimeFilterTitle option={a} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        ),
      },
      {
        title: "都道府縣",
        children: (
          <div className="space-y-0.5">
            <FilterLink
              active={prefecture === "all"}
              onClick={() => setPrefecture("all")}
            >
              全部地區
            </FilterLink>
            {PREFECTURES.map((p) => (
              <FilterLink
                key={p}
                active={prefecture === p}
                onClick={() => setPrefecture(p)}
              >
                {p}
              </FilterLink>
            ))}
          </div>
        ),
      },
      {
        title: "顯示",
        children: (
          <label className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
            <span>僅已打卡</span>
            <Switch checked={visitedOnly} onCheckedChange={setVisitedOnly} />
          </label>
        ),
      },
    ],
    [prefecture, visitedOnly, animeQuery, animeOptions, anilistId, selectedAnimeOption]
  );

  return (
    <PageShell variant="wide" noPadding className="px-0 py-0 md:px-4 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <FilterSidebar sections={filterSections} className="hidden md:block px-4 md:px-0" />

        <div className="min-w-0 flex-1 space-y-4 px-4 md:px-0">
          <div className="flex items-start justify-between gap-3">
            <PageHeader
              title="地圖探索"
              description="以 OpenStreetMap 瀏覽聖地分布，點選標記查看詳情"
            />
            <div className="flex shrink-0 gap-2 pt-1">
              <FilterDrawer sections={filterSections} />
              <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/spots">
                  <SlidersHorizontal className="h-4 w-4" />
                  列表模式
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">
              <MapPin className="mr-1 h-3 w-3" />
              {loading ? "載入中..." : `${markers.length} 處`}
            </Badge>
            {prefecture !== "all" && (
              <Badge variant="outline">{prefecture}</Badge>
            )}
            {anilistId != null && selectedAnimeOption && (
              <MapAnimeFilterBadge>
                <AnimeFilterTitle option={selectedAnimeOption} />
              </MapAnimeFilterBadge>
            )}
            {visitedOnly && <Badge variant="success">已打卡</Badge>}
          </div>

          {error && !loading ? (
            <EmptyState
              icon={AlertTriangle}
              title="載入失敗"
              description={error}
              actionLabel="重試"
              onAction={() => fetchMarkers()}
            />
          ) : loading && markers.length === 0 ? (
            <Skeleton className="h-[calc(100dvh-12rem)] w-full rounded-xl md:h-[calc(100vh-14rem)]" />
          ) : !loading && markers.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="此區域沒有聖地"
              description="試試清除篩選條件，或縮小地圖範圍後再瀏覽其他區域"
              actionLabel={
                prefecture !== "all" || visitedOnly || anilistId != null
                  ? "清除篩選"
                  : undefined
              }
              onAction={
                prefecture !== "all" || visitedOnly || anilistId != null
                  ? () => {
                      setPrefecture("all");
                      setVisitedOnly(false);
                      clearAnimeFilter();
                    }
                  : undefined
              }
            />
          ) : (
            <ExploreMap
              markers={markers}
              fullscreen
              onBoundsChange={handleBoundsChange}
              anilistId={anilistId}
              className="w-full"
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
