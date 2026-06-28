"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { PREFECTURES } from "@seichi/shared";
import { Search, MapPin, Film, BookOpen, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/ui/motion";
import { FilterSidebar, FilterLink } from "@/components/ui/filter-sidebar";
import { FilterDrawer } from "@/components/ui/filter-drawer";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { SpotSearchRow } from "@/components/search/spot-search-row";
import { AnimeSearchRow } from "@/components/search/anime-search-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
type ResultType = "all" | "spots" | "anime" | "travelogues" | "users";

interface SearchResults {
  spots: {
    id: string;
    nameZh: string;
    nameJa?: string | null;
    prefecture: string;
  }[];
  anime: {
    id?: number;
    anilistId?: number;
    titles?: { native?: string; romaji?: string };
    title?: { native?: string };
    coverImage?: string | { large?: string } | null;
  }[];
  travelogues: {
    slug: string;
    title: string;
    excerpt?: string;
    coverImageUrl?: string | null;
  }[];
  users: {
    id: string;
    name: string;
    username?: string;
    image?: string | null;
  }[];
  nextCursor: number | null;
}

const RECENT_SEARCHES_KEY = "seichi-recent-searches";
const MAX_RECENT = 8;

function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const prev = loadRecentSearches().filter((q) => q !== trimmed);
  const next = [trimmed, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

const POPULAR_CHIPS = [
  "你的名字",
  "聲之形",
  "東京都",
  "京都府",
  "對比照",
  "遊記",
];

const TAB_CONFIG: {
  value: ResultType;
  labelKey: "typeAll" | "typeAnime" | "typeSpots" | "typeTravelogues" | "typeUsers";
  icon: typeof Film;
}[] = [
  { value: "all", labelKey: "typeAll", icon: Search },
  { value: "anime", labelKey: "typeAnime", icon: Film },
  { value: "spots", labelKey: "typeSpots", icon: MapPin },
  { value: "travelogues", labelKey: "typeTravelogues", icon: BookOpen },
  { value: "users", labelKey: "typeUsers", icon: User },
];

function getAnimeCover(a: SearchResults["anime"][0]): string | null {
  if (!a.coverImage) return null;
  if (typeof a.coverImage === "string") return a.coverImage;
  return a.coverImage.large ?? null;
}


function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <Skeleton className="h-14 w-10 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const t = useTranslations("search");
  const tc = useTranslations("common");
  const te = useTranslations("empty");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ResultType>("all");
  const [prefecture, setPrefecture] = useState("");
  const [hasComparison, setHasComparison] = useState(false);
  const [season, setSeason] = useState("");
  const [hasPhotos, setHasPhotos] = useState(false);
  const [excludeSensitive, setExcludeSensitive] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [dbFallback, setDbFallback] = useState(false);
  const resultsRef = useRef<SearchResults | null>(null);
  const initialQHandled = useRef(false);
  const prevFilterKey = useRef("");

  resultsRef.current = results;

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || initialQHandled.current) return;
    initialQHandled.current = true;
    setQuery(q);
    search(undefined, 0, q);
  }, [searchParams]);

  const hasActiveFilters =
    !!prefecture ||
    hasComparison ||
    !!season ||
    hasPhotos ||
    excludeSensitive;

  const search = useCallback(
    async (e?: React.FormEvent, nextCursor = 0, queryOverride?: string) => {
      e?.preventDefault();
      const searchQuery = queryOverride ?? query;
      if (queryOverride) setQuery(queryOverride);
      setLoading(true);
      setSearched(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (type !== "all") params.set("type", type);
      if (prefecture) params.set("prefecture", prefecture);
      if (hasComparison) params.set("hasComparison", "true");
      if (season) params.set("season", season);
      if (hasPhotos) params.set("hasPhotos", "true");
      if (excludeSensitive) params.set("isSensitive", "false");
      params.set("cursor", String(nextCursor));
      params.set("limit", "20");

      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery);
        setRecentSearches(loadRecentSearches());
        const url = new URL(window.location.href);
        url.searchParams.set("q", searchQuery.trim());
        router.replace(url.pathname + url.search, { scroll: false });
      }

      try {
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) {
          throw new Error(t("errorTitle"));
        }
        const data = await res.json();
        setDbFallback(data.source === "db_fallback");

        if (nextCursor > 0 && resultsRef.current) {
          setResults({
            spots: [...resultsRef.current.spots, ...(data.spots ?? [])],
            anime: [...resultsRef.current.anime, ...(data.anime ?? [])],
            travelogues: [...resultsRef.current.travelogues, ...(data.travelogues ?? [])],
            users: [...resultsRef.current.users, ...(data.users ?? [])],
            nextCursor: data.nextCursor,
          });
        } else {
          setResults({
            spots: data.spots ?? [],
            anime: data.anime ?? [],
            travelogues: data.travelogues ?? [],
            users: data.users ?? [],
            nextCursor: data.nextCursor,
          });
        }
      } catch {
        if (nextCursor === 0) {
          setResults(null);
          setError(t("errorDefault"));
        }
      } finally {
        setLoading(false);
      }
    },
    [
      query,
      type,
      prefecture,
      hasComparison,
      season,
      hasPhotos,
      excludeSensitive,
      router,
      t,
    ]
  );

  const filterKey = `${type}|${prefecture}|${hasComparison}|${season}|${hasPhotos}|${excludeSensitive}`;

  useEffect(() => {
    if (!prevFilterKey.current) {
      prevFilterKey.current = filterKey;
      return;
    }
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    if (searched || query.trim() || hasActiveFilters) {
      search();
    }
  }, [filterKey, searched, query, hasActiveFilters, search]);

  function loadMore() {
    if (results?.nextCursor != null) {
      search(undefined, results.nextCursor);
    }
  }

  function handleChipClick(chip: string) {
    search(undefined, 0, chip);
  }

  const showSpots = type === "all" || type === "spots";
  const showAnime = type === "all" || type === "anime";
  const showTravelogues = type === "all" || type === "travelogues";
  const showUsers = type === "all" || type === "users";

  const hasResults =
    results &&
    (results.spots.length > 0 ||
      results.anime.length > 0 ||
      results.travelogues.length > 0 ||
      results.users.length > 0);

  const filterSections = useMemo(
    () => [
      {
        title: t("filterType"),
        children: (
          <div className="space-y-0.5">
            {TAB_CONFIG.map(({ value, labelKey, icon: Icon }) => (
              <FilterLink
                key={value}
                active={type === value}
                onClick={() => setType(value)}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {t(labelKey)}
                </span>
              </FilterLink>
            ))}
          </div>
        ),
      },
      ...(type === "all" || type === "spots"
        ? [
            {
              title: t("filterPrefecture"),
              children: (
                <div className="max-h-64 space-y-0.5 overflow-y-auto scrollbar-thin">
                  <FilterLink
                    active={!prefecture}
                    onClick={() => setPrefecture("")}
                  >
                    {tc("all")}
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
          ]
        : []),
      {
        title: t("popular"),
        children: (
          <div className="space-y-0.5">
            {POPULAR_CHIPS.map((chip) => (
              <FilterLink
                key={chip}
                onClick={() => handleChipClick(chip)}
              >
                {chip}
              </FilterLink>
            ))}
          </div>
        ),
      },
      ...(recentSearches.length > 0
        ? [
            {
              title: t("recent"),
              children: (
                <div className="space-y-0.5">
                  {recentSearches.map((term) => (
                    <FilterLink
                      key={term}
                      onClick={() => handleChipClick(term)}
                    >
                      {term}
                    </FilterLink>
                  ))}
                </div>
              ),
            },
          ]
        : []),
    ],
    [type, prefecture, recentSearches, t, tc]
  );

  return (
    <PageShell variant="wide" className="py-10">
      <div className="flex gap-8">
        <FilterSidebar sections={filterSections} />

        <div className="min-w-0 flex-1">
      <FadeIn>
        <PageHeader
          variant="centered"
          title={t("title")}
          description={t("description")}
        />
      </FadeIn>

      <FadeIn delay={0.1} className="mt-8">
        <form
          id="search-form"
          onSubmit={(e) => search(e, 0)}
          className="glass rounded-2xl p-6 shadow-glow-sm"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("placeholder")}
                className="h-12 border-border bg-surface/80 pl-10 text-base"
              />
            </div>
            <Button type="submit" disabled={loading} size="lg" className="shrink-0">
              {loading ? t("searching") : t("submit")}
            </Button>
          </div>

          {(type === "all" || type === "spots") && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Select
                value={prefecture || "all"}
                onValueChange={(v) => setPrefecture(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[180px] border-border bg-surface/80">
                  <SelectValue placeholder={t("allPrefectures")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allPrefectures")}</SelectItem>
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={hasComparison}
                  onChange={(e) => setHasComparison(e.target.checked)}
                  className="rounded border-white/20 bg-surface accent-primary"
                />
                {t("hasComparison")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={hasPhotos}
                  onChange={(e) => setHasPhotos(e.target.checked)}
                  className="rounded border-white/20 bg-surface accent-primary"
                />
                {t("hasPhotos")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={excludeSensitive}
                  onChange={(e) => setExcludeSensitive(e.target.checked)}
                  className="rounded border-white/20 bg-surface accent-primary"
                />
                {t("excludeSensitive")}
              </label>
              <Select value={season || "all"} onValueChange={(v) => setSeason(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px] border-border bg-surface/80">
                  <SelectValue placeholder={t("season")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allSeasons")}</SelectItem>
                  {["春", "夏", "秋", "冬"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>
      </FadeIn>

      <div className="mt-4 lg:hidden">
        <FilterDrawer sections={filterSections} />
      </div>

      <FadeIn delay={0.15} className="mt-6">
        <Tabs value={type} onValueChange={(v) => setType(v as ResultType)}>
          <TabsList className="glass w-full justify-start overflow-x-auto">
            {TAB_CONFIG.map(({ value, labelKey, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {t(labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_CONFIG.map(({ value }) => (
            <TabsContent key={value} value={value} className="mt-6">
              {!searched && !loading && (
                <div>
                  <p className="mb-3 text-sm text-muted-foreground">{t("popular")}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {POPULAR_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && !loading && (
                <EmptyState
                  icon={Search}
                  title={t("errorTitle")}
                  description={error}
                  actionLabel={tc("retry")}
                  onAction={() => search()}
                />
              )}

              {!error && loading && <ResultSkeleton />}

              {!error && !loading && searched && results && (
                <div className="space-y-3">
                  {showAnime &&
                    results.anime.map((a) => (
                      <AnimeSearchRow
                        key={a.anilistId ?? a.id}
                        anime={a}
                        cover={getAnimeCover(a)}
                      />
                    ))}

                  {showSpots &&
                    results.spots.map((s) => (
                      <SpotSearchRow key={s.id} spot={s} />
                    ))}

                  {showTravelogues &&
                    results.travelogues.map((t) => (
                      <Link key={t.slug} href={`/travelogue/${t.slug}`}>
                        <Card className="flex items-center gap-4 p-3 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                          <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-elevated">
                            {t.coverImageUrl ? (
                              <Image
                                src={t.coverImageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{t.title}</p>
                            {t.excerpt && (
                              <p className="line-clamp-1 text-sm text-muted-foreground">
                                {t.excerpt}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}

                  {showUsers &&
                    results.users.map((u) => (
                      <Link key={u.id} href={`/users/${u.id}`}>
                        <Card className="flex items-center gap-4 p-3 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={u.image ?? undefined} />
                            <AvatarFallback>{u.name?.[0] ?? "?"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{u.name}</p>
                            {u.username && (
                              <p className="text-sm text-muted-foreground">
                                @{u.username}
                              </p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}

                  {!hasResults && (
                    <EmptyState
                      icon={Search}
                      title={te("noResults")}
                      description={
                        prefecture ? t("noResultsPrefecture") : t("noResultsDefault")
                      }
                      actionLabel={prefecture ? t("clearPrefecture") : undefined}
                      onAction={prefecture ? () => setPrefecture("") : undefined}
                    />
                  )}

                  {dbFallback && hasResults && process.env.NODE_ENV === "development" && (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                      {t("dbFallbackDev")}
                    </p>
                  )}

                  {results.nextCursor != null && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? tc("loading") : tc("loadMore")}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </FadeIn>
        </div>
      </div>
    </PageShell>
  );
}
