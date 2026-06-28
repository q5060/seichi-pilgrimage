const ANILIST_API = "https://graphql.anilist.co";

export interface AniListMedia {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: { large?: string };
  bannerImage?: string;
  format?: string;
  status?: string;
  episodes?: number;
  season?: string;
  seasonYear?: number;
  genres?: string[];
  description?: string;
  averageScore?: number;
}

const MEDIA_QUERY = `
  query ($id: Int, $search: String) {
    Media(id: $id, search: $search, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large }
      bannerImage
      format
      status
      episodes
      season
      seasonYear
      genres
      description
      averageScore
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english native }
        coverImage { large }
        episodes
        seasonYear
        averageScore
      }
    }
  }
`;

const SEASON_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int, $genre_in: [String]) {
    Page(page: $page, perPage: $perPage) {
      media(
        season: $season
        seasonYear: $seasonYear
        type: ANIME
        sort: POPULARITY_DESC
        genre_in: $genre_in
      ) {
        id
        title { romaji english native }
        coverImage { large }
        bannerImage
        format
        status
        episodes
        season
        seasonYear
        genres
        description
        averageScore
      }
    }
  }
`;

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int, $genre_in: [String]) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC, genre_in: $genre_in) {
        id
        title { romaji english native }
        coverImage { large }
        bannerImage
        format
        status
        episodes
        season
        seasonYear
        genres
        description
        averageScore
      }
    }
  }
`;

async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "AniList error");
  return json.data;
}

export async function fetchAnimeById(id: number): Promise<AniListMedia | null> {
  const data = await anilistFetch<{ Media: AniListMedia | null }>(MEDIA_QUERY, {
    id,
  });
  return data.Media;
}

export async function searchAnime(
  search: string,
  page = 1,
  perPage = 20
): Promise<AniListMedia[]> {
  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(
    SEARCH_QUERY,
    { search, page, perPage }
  );
  return data.Page.media;
}

export type MediaSeason = "WINTER" | "SPRING" | "SUMMER" | "FALL";

export async function fetchSeasonAnime(
  season: MediaSeason,
  seasonYear: number,
  page = 1,
  perPage = 24,
  genre?: string
): Promise<AniListMedia[]> {
  const variables: Record<string, unknown> = {
    season,
    seasonYear,
    page,
    perPage,
  };
  if (genre) variables.genre_in = [genre];

  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(
    SEASON_QUERY,
    variables
  );
  return data.Page.media;
}

export async function fetchTrendingAnime(
  page = 1,
  perPage = 20,
  genre?: string
): Promise<AniListMedia[]> {
  const variables: Record<string, unknown> = { page, perPage };
  if (genre) variables.genre_in = [genre];

  const data = await anilistFetch<{ Page: { media: AniListMedia[] } }>(
    TRENDING_QUERY,
    variables
  );
  return data.Page.media;
}

export function mediaToDbFormat(media: AniListMedia) {
  return {
    anilistId: media.id,
    titles: {
      romaji: media.title.romaji,
      english: media.title.english,
      native: media.title.native,
    },
    coverImage: media.coverImage?.large ?? null,
    bannerImage: media.bannerImage ?? null,
    format: media.format ?? null,
    status: media.status ?? null,
    episodes: media.episodes ?? null,
    season: media.season ?? null,
    seasonYear: media.seasonYear ?? null,
    genres: media.genres ?? [],
    description: media.description?.replace(/<[^>]*>/g, "") ?? null,
    averageScore: media.averageScore ?? null,
    syncedAt: new Date(),
  };
}
