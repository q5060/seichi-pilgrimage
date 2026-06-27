import type { AnimeTitles } from "@seichi/shared";

export interface SpotIndexDoc {
  id: string;
  nameZh: string;
  nameJa?: string | null;
  prefecture: string;
  address?: string | null;
  animeTitles?: string[];
}

export interface TravelogueIndexDoc {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  authorName?: string | null;
}

export interface AnimeIndexDoc {
  id: string;
  titleRomaji?: string | null;
  titleNative?: string | null;
  titleEnglish?: string | null;
  titleChinese?: string | null;
  seasonYear?: number | null;
}

export interface UserIndexDoc {
  id: string;
  name?: string | null;
  username?: string | null;
  bio?: string | null;
}

export function animeTitlesToSearchTerms(titles: AnimeTitles): string[] {
  return [titles.romaji, titles.english, titles.native, titles.chinese].filter(
    (t): t is string => Boolean(t)
  );
}

export function spotToIndexDoc(
  spot: {
    id: string;
    nameZh: string;
    nameJa?: string | null;
    prefecture: string;
    address?: string | null;
  },
  animeTitles: string[] = []
): SpotIndexDoc {
  return {
    id: spot.id,
    nameZh: spot.nameZh,
    nameJa: spot.nameJa,
    prefecture: spot.prefecture,
    address: spot.address,
    animeTitles: [...new Set(animeTitles)],
  };
}

export function travelogueToIndexDoc(
  travelogue: {
    id: string;
    title: string;
    excerpt?: string | null;
    slug: string;
  },
  author?: { name?: string | null; username?: string | null } | null
): TravelogueIndexDoc {
  return {
    id: travelogue.id,
    title: travelogue.title,
    excerpt: travelogue.excerpt,
    slug: travelogue.slug,
    authorName: author?.name ?? author?.username ?? null,
  };
}

export function animeToIndexDoc(anime: {
  anilistId: number;
  titles: unknown;
  seasonYear?: number | null;
}): AnimeIndexDoc {
  const titles = anime.titles as AnimeTitles;
  return {
    id: String(anime.anilistId),
    titleRomaji: titles.romaji,
    titleNative: titles.native,
    titleEnglish: titles.english,
    titleChinese: titles.chinese,
    seasonYear: anime.seasonYear,
  };
}

export function userToIndexDoc(user: {
  id: string;
  name?: string | null;
  username?: string | null;
  bio?: string | null;
}): UserIndexDoc {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
  };
}
