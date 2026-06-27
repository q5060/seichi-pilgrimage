"use client";

import Link from "next/link";
import Image from "next/image";
import { Film } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnimeDisplayTitle } from "@/hooks/use-anime-display-title";

export function AnimeSearchRow({
  anime,
  cover,
}: {
  anime: {
    id?: number;
    anilistId?: number;
    titles?: { native?: string; romaji?: string; chinese?: string; english?: string };
    title?: { native?: string; romaji?: string };
  };
  cover: string | null;
}) {
  const id = anime.anilistId ?? anime.id;
  const title = useAnimeDisplayTitle(anime.titles ?? anime.title ?? {});

  return (
    <Link href={`/anime/${id}`}>
      <Card className="flex items-center gap-4 p-3 transition-all hover:border-primary/30 hover:shadow-glow-sm">
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-elevated">
          {cover ? (
            <Image src={cover} alt="" fill className="object-cover" sizes="40px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <Badge variant="secondary" className="mt-1">
            作品
          </Badge>
        </div>
      </Card>
    </Link>
  );
}
