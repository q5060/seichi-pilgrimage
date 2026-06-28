"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PREFECTURES } from "@seichi/shared";
import { MapPin, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualGrid } from "@/components/ui/virtual-grid";
import { NearbySpotsButton } from "@/components/spots/nearby-spots-button";
import { SpotCard, type SpotCardData } from "@/components/spots/spot-card";
import { FilterSidebar, FilterLink } from "@/components/ui/filter-sidebar";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { PageShell } from "@/components/layout/page-shell";
import { cn } from "@/lib/utils";
import { SPOTS_LIST_PAGE_SIZE } from "@/lib/spots-list-constants";

interface SpotItem extends SpotCardData {
  latitude: number;
  longitude: number;
}

interface SpotsResponse {
  items: SpotItem[];
  nextCursor: number | null;
}

interface SpotsExploreClientProps {
  initialSpots: SpotItem[];
  initialNextCursor: number | null;
  initialPrefecture?: string;
}

function SpotGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExploreNearbySpots() {
  const t = useTranslations("spots");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState("");
  const [requesting, setRequesting] = useState(false);

  function requestLocation() {
    if (!navigator.geolocation) {
      setGeoError(t("geoUnsupported"));
      return;
    }
    setRequesting(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setRequesting(false);
      },
      () => {
        setGeoError(t("geoDenied"));
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  if (!coords) {
    return (
      <Button
        variant="glass"
        size="sm"
        onClick={requestLocation}
        disabled={requesting}
      >
        <MapPin className="h-4 w-4" />
        {requesting ? t("locating") : t("nearby")}
      </Button>
    );
  }

  return (
    <div className="w-64">
      <NearbySpotsButton lat={coords.lat} lng={coords.lng} excludeId="" />
      {geoError && <p className="mt-1 text-xs text-destructive">{geoError}</p>}
    </div>
  );
}

export function SpotsExploreClient({
  initialSpots,
  initialNextCursor,
  initialPrefecture = "all",
}: SpotsExploreClientProps) {
  const t = useTranslations("spots");
  const tc = useTranslations("common");
  const [spots, setSpots] = useState<SpotItem[]>(initialSpots);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [prefecture, setPrefecture] = useState(initialPrefecture);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [, startTransition] = useTransition();

  const fetchSpots = useCallback(
    async (pref: string, cursor = 0, append = false) => {
      const params = new URLSearchParams({
        limit: String(SPOTS_LIST_PAGE_SIZE),
        cursor: String(cursor),
      });
      if (pref && pref !== "all") {
        params.set("prefecture", pref);
      }
      const res = await fetch(`/api/spots?${params}`);
      const data: SpotsResponse = await res.json();
      setSpots((prev) => (append ? [...prev, ...data.items] : data.items));
      setNextCursor(data.nextCursor);
    },
    []
  );

  useEffect(() => {
    if (prefecture === initialPrefecture) {
      setSpots(initialSpots);
      setNextCursor(initialNextCursor);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchSpots(prefecture)
      .catch(() => {
        setSpots([]);
        setNextCursor(null);
      })
      .finally(() => setLoading(false));
  }, [prefecture, initialPrefecture, initialSpots, initialNextCursor, fetchSpots]);

  const filteredSpots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return spots;
    return spots.filter(
      (s) =>
        s.nameZh.toLowerCase().includes(q) ||
        s.nameJa?.toLowerCase().includes(q) ||
        s.prefecture.toLowerCase().includes(q)
    );
  }, [spots, search]);

  async function loadMore() {
    if (nextCursor == null || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchSpots(prefecture, nextCursor, true);
    } finally {
      setLoadingMore(false);
    }
  }

  function handlePrefectureChange(value: string) {
    startTransition(() => setPrefecture(value));
  }

  const filterSections = [
    {
      title: t("prefectureFilter"),
      children: (
        <div className="space-y-0.5">
          <FilterLink
            active={prefecture === "all"}
            onClick={() => handlePrefectureChange("all")}
          >
            {t("allRegions")}
          </FilterLink>
          {PREFECTURES.map((p) => (
            <FilterLink
              key={p}
              active={prefecture === p}
              onClick={() => handlePrefectureChange(p)}
            >
              {p}
            </FilterLink>
          ))}
        </div>
      ),
    },
  ];

  return (
    <PageShell variant="wide">
      <div className="flex gap-8">
        <FilterSidebar sections={filterSections} />

        <div className="min-w-0 flex-1 animate-fade-in">
          <PageHeader
            title={t("title")}
            description={t("description")}
            action={
              <div className="flex items-center gap-2">
                <FilterDrawer sections={filterSections} />
                <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
                  <Link href="/spots/map" prefetch={false}>
                    {t("mapMode")}
                  </Link>
                </Button>
                <div className="hidden md:block">
                  <ExploreNearbySpots />
                </div>
              </div>
            }
          />

          <div className="mb-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={prefecture} onValueChange={handlePrefectureChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("selectPrefecture")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allRegions")}</SelectItem>
                {PREFECTURES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <SpotGridSkeleton />
          ) : filteredSpots.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={search ? t("emptySearchTitle") : t("emptyRegionTitle")}
              description={
                search ? t("emptySearchDescription") : t("emptyRegionDescription")
              }
              actionLabel={search ? undefined : t("addSpot")}
              actionHref={search ? undefined : "/spots/new"}
            />
          ) : (
            <>
              {filteredSpots.length > 24 ? (
                <VirtualGrid
                  items={filteredSpots}
                  getKey={(spot) => spot.id}
                  renderItem={(spot) => <SpotCard spot={spot} />}
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredSpots.map((spot) => (
                    <SpotCard key={spot.id} spot={spot} />
                  ))}
                </div>
              )}
              {nextCursor != null && !search && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? tc("loading") : tc("loadMore")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "fixed bottom-20 right-4 z-40 md:hidden",
          "glass rounded-xl p-3 shadow-glow-sm"
        )}
      >
        <ExploreNearbySpots />
      </div>
    </PageShell>
  );
}
