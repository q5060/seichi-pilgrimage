"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSpotDisplayName } from "@/hooks/use-spot-display-name";

export interface SpotCardData {
  id: string;
  nameZh: string;
  nameJa?: string | null;
  prefecture: string;
  coverPhotoUrl?: string | null;
  visitCount?: number;
}

export function SpotCard({ spot, className }: { spot: SpotCardData; className?: string }) {
  const displayName = useSpotDisplayName(spot);
  const secondaryName =
    displayName === spot.nameZh ? spot.nameJa : spot.nameZh;

  return (
    <Link
      href={`/spots/${spot.id}`}
      className={cn(
        "group overflow-hidden rounded-xl border border-border/60 bg-card shadow-elevated transition-all duration-300 hover:border-primary/20",
        className
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-brand-900/60 via-elevated to-primary/5">
        {spot.coverPhotoUrl ? (
          <Image
            src={spot.coverPhotoUrl}
            alt={displayName}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold leading-tight group-hover:text-primary">
            {displayName}
          </h3>
          <Badge variant="secondary" className="shrink-0">
            {spot.prefecture}
          </Badge>
        </div>
        {secondaryName && (
          <p className="mt-1 text-sm text-muted-foreground">{secondaryName}</p>
        )}
        {spot.visitCount != null && spot.visitCount > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {spot.visitCount} 次打卡
          </p>
        )}
      </div>
    </Link>
  );
}
