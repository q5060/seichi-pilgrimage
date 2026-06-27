"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "./explore-map-inner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const ExploreMapInner = dynamic(() => import("./explore-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

export type { MapMarker };

interface ExploreMapProps {
  markers: MapMarker[];
  className?: string;
  fullscreen?: boolean;
  onBoundsChange?: (bounds: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  anilistId?: number | null;
}

export function ExploreMap(props: ExploreMapProps) {
  return (
    <div className={cn("relative", props.className)}>
      <ExploreMapInner {...props} />
    </div>
  );
}
