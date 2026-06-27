import type { AnimeTitles } from "@seichi/shared";

export function spotToIndexDoc(
  spot: {
    id: string;
    nameZh: string;
    nameJa?: string | null;
    prefecture: string;
    address?: string | null;
  },
  animeTitles: string[] = []
) {
  return {
    id: spot.id,
    nameZh: spot.nameZh,
    nameJa: spot.nameJa,
    prefecture: spot.prefecture,
    address: spot.address,
    animeTitles: [...new Set(animeTitles)],
  };
}

export function travelogueToIndexDoc(travelogue: {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
}) {
  return {
    id: travelogue.id,
    title: travelogue.title,
    excerpt: travelogue.excerpt,
    slug: travelogue.slug,
  };
}

export function animeToIndexDoc(anime: {
  anilistId: number;
  titles: unknown;
  seasonYear?: number | null;
}) {
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
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    bio: user.bio,
  };
}
