import type { MediaSeason } from "./anilist";

export type BrowseTab = "season" | "trending" | "pilgrimage";

export const BROWSE_TABS: BrowseTab[] = ["season", "trending", "pilgrimage"];

export const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Romance",
  "Slice of Life",
  "Sci-Fi",
  "Mystery",
  "Supernatural",
  "Sports",
  "Music",
  "Horror",
  "Psychological",
  "Thriller",
] as const;

export const SEASON_OPTIONS: { value: MediaSeason; label: string }[] = [
  { value: "WINTER", label: "冬季" },
  { value: "SPRING", label: "春季" },
  { value: "SUMMER", label: "夏季" },
  { value: "FALL", label: "秋季" },
];

export function defaultSeasonForDate(date = new Date()): {
  season: MediaSeason;
  year: number;
} {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 2) return { season: "WINTER", year };
  if (month <= 5) return { season: "SPRING", year };
  if (month <= 8) return { season: "SUMMER", year };
  return { season: "FALL", year };
}

export function parseBrowseTab(raw?: string): BrowseTab {
  if (raw && BROWSE_TABS.includes(raw as BrowseTab)) return raw as BrowseTab;
  return "season";
}

export function parseSeason(raw?: string): MediaSeason {
  const valid = SEASON_OPTIONS.map((s) => s.value);
  if (raw && valid.includes(raw as MediaSeason)) return raw as MediaSeason;
  return defaultSeasonForDate().season;
}

export function parseYear(raw?: string): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 2000 && n <= 2100) return n;
  return defaultSeasonForDate().year;
}
