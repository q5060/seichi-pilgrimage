"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ExploreMap, type MapMarker } from "@/components/map/explore-map";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AnimeSpotMap({ anilistId }: { anilistId: number }) {
  const [open, setOpen] = useState(false);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    fetch(`/api/spots/map?anilistId=${anilistId}&limit=500`)
      .then((r) => r.json())
      .then((data) => {
        setMarkers(data.markers ?? []);
        setLoaded(true);
      })
      .catch(() => setMarkers([]))
      .finally(() => setLoading(false));
  }, [open, loaded, anilistId]);

  if (markers.length === 0 && loaded) return null;

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">聖地分布圖</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <>
              <ChevronUp className="h-4 w-4" />
              收合
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              展開地圖
            </>
          )}
        </Button>
      </div>
      {open && (
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-[420px] w-full rounded-xl" />
          ) : (
            <ExploreMap markers={markers} />
          )}
        </div>
      )}
    </section>
  );
}
