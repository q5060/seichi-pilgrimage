"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSpotDisplayName } from "@/hooks/use-spot-display-name";

export function SpotSearchRow({
  spot,
}: {
  spot: { id: string; nameZh: string; nameJa?: string | null; prefecture: string };
}) {
  const displayName = useSpotDisplayName(spot);

  return (
    <Link href={`/spots/${spot.id}`}>
      <Card className="flex items-center gap-4 p-3 transition-all hover:border-primary/30 hover:shadow-glow-sm">
        <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">{spot.prefecture}</p>
        </div>
      </Card>
    </Link>
  );
}
