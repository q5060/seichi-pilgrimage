"use client";

import Image from "next/image";
import { Film } from "lucide-react";
import { useAnimeDisplayTitle } from "@/hooks/use-anime-display-title";

type AnimeHit = {
  anilistId?: number;
  id?: number;
  titles?: { native?: string; romaji?: string; chinese?: string; english?: string };
  title?: { native?: string; romaji?: string };
  coverImage?: string | { large?: string } | null;
};

export function AnimeListSearchItem({
  anime,
  disabled,
  onSelect,
}: {
  anime: AnimeHit;
  disabled?: boolean;
  onSelect: (anilistId: number, title: string, cover: string | null) => void;
}) {
  const title = useAnimeDisplayTitle(anime.titles ?? anime.title ?? {});
  const anilistId = anime.anilistId ?? anime.id ?? 0;
  const cover =
    typeof anime.coverImage === "string"
      ? anime.coverImage
      : anime.coverImage?.large ?? null;

  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
      onClick={() => onSelect(anilistId, title, cover)}
    >
      {cover ? (
        <Image
          src={cover}
          alt=""
          width={28}
          height={40}
          className="rounded object-cover"
        />
      ) : (
        <Film className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{title}</span>
    </button>
  );
}
