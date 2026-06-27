"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { Locate, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSpotDisplayName } from "@/hooks/use-spot-display-name";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  nameZh: string;
  nameJa?: string | null;
  lat: number;
  lng: number;
  prefecture: string;
  coverPhotoUrl?: string | null;
  visited?: boolean;
}

interface ExploreMapInnerProps {
  markers: MapMarker[];
  className?: string;
  fullscreen?: boolean;
  onBoundsChange?: (bounds: string) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  anilistId?: number | null;
}

const defaultIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#6d9ec4;border:2px solid #0d1118;box-shadow:0 0 6px rgba(109,158,196,0.45)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const visitedIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:50%;background:#5a9a7a;border:2px solid #0d1118;box-shadow:0 0 6px rgba(90,154,122,0.4)"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function BoundsReporter({ onBoundsChange }: { onBoundsChange?: (b: string) => void }) {
  const map = useMap();
  const report = useCallback(() => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    onBoundsChange(
      [sw.lat, sw.lng, ne.lat, ne.lng].map((n) => n.toFixed(5)).join(",")
    );
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: report,
    zoomend: report,
  });

  useEffect(() => {
    report();
  }, [report]);

  return null;
}

function LocateControl() {
  const map = useMap();
  return (
    <Button
      type="button"
      size="icon"
      variant="glass"
      className="absolute right-3 top-3 z-[1000] h-10 w-10"
      onClick={() => {
        map.locate({ setView: true, maxZoom: 14 });
      }}
      aria-label="我的位置"
    >
      <Locate className="h-4 w-4" />
    </Button>
  );
}

function clusterMarkers(markers: MapMarker[], zoom: number): Array<{
  type: "cluster" | "marker";
  lat: number;
  lng: number;
  count?: number;
  marker?: MapMarker;
}> {
  if (zoom >= 13 || markers.length < 80) {
    return markers.map((m) => ({
      type: "marker" as const,
      lat: m.lat,
      lng: m.lng,
      marker: m,
    }));
  }

  const cell = zoom < 10 ? 0.5 : zoom < 12 ? 0.15 : 0.05;
  const grid = new Map<string, MapMarker[]>();

  for (const m of markers) {
    const key = `${Math.floor(m.lat / cell)}:${Math.floor(m.lng / cell)}`;
    const bucket = grid.get(key) ?? [];
    bucket.push(m);
    grid.set(key, bucket);
  }

  const result: ReturnType<typeof clusterMarkers> = [];
  for (const bucket of grid.values()) {
    if (bucket.length === 1) {
      result.push({
        type: "marker",
        lat: bucket[0].lat,
        lng: bucket[0].lng,
        marker: bucket[0],
      });
    } else {
      const lat = bucket.reduce((s, m) => s + m.lat, 0) / bucket.length;
      const lng = bucket.reduce((s, m) => s + m.lng, 0) / bucket.length;
      result.push({ type: "cluster", lat, lng, count: bucket.length });
    }
  }
  return result;
}

const clusterIcon = (count: number) =>
  L.divIcon({
    className: "",
    html: `<div style="min-width:28px;height:28px;padding:0 6px;border-radius:14px;background:rgba(109,158,196,0.88);color:#0d1118;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #0d1118">${count}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

function SpotMapLabel({ marker }: { marker: MapMarker }) {
  const displayName = useSpotDisplayName(marker);
  return <p className="font-medium">{displayName}</p>;
}

function SpotMapCoverImage({ marker }: { marker: MapMarker }) {
  const displayName = useSpotDisplayName(marker);
  if (!marker.coverPhotoUrl) return null;
  return (
    <div className="relative mb-2 h-20 w-full overflow-hidden rounded-md">
      <Image
        src={marker.coverPhotoUrl}
        alt={displayName}
        fill
        className="object-cover"
        sizes="200px"
      />
    </div>
  );
}

export default function ExploreMapInner({
  markers,
  className,
  fullscreen = false,
  onBoundsChange,
  initialCenter = [35.6762, 139.6503],
  initialZoom = 6,
  anilistId,
}: ExploreMapInnerProps) {
  const [zoom, setZoom] = useState(initialZoom);
  const [selected, setSelected] = useState<MapMarker | null>(null);

  const displayed = useMemo(() => clusterMarkers(markers, zoom), [markers, zoom]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border",
        fullscreen ? "h-[calc(100dvh-8rem)] md:h-[calc(100vh-10rem)]" : "h-[420px]",
        className
      )}
    >
      {anilistId != null && (
        <div className="absolute left-3 top-3 z-[1000]">
          <Badge variant="secondary" className="text-xs">
            作品篩選中
          </Badge>
        </div>
      )}
      <div className="absolute bottom-3 left-3 z-[1000] flex flex-col gap-1.5 rounded-lg border border-border bg-background/90 p-2 text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#6d9ec4] ring-2 ring-[#0d1118]" />
          <span className="text-muted-foreground">未打卡</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#5a9a7a] ring-2 ring-[#0d1118]" />
          <span className="text-muted-foreground">已打卡</span>
        </div>
      </div>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="h-full w-full z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <BoundsReporter onBoundsChange={onBoundsChange} />
        <LocateControl />
        <ZoomWatcher onZoom={setZoom} />

        {displayed.map((item, i) => {
          if (item.type === "cluster") {
            return (
              <Marker
                key={`c-${i}`}
                position={[item.lat, item.lng]}
                icon={clusterIcon(item.count ?? 0)}
              />
            );
          }
          const m = item.marker!;
          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={m.visited ? visitedIcon : defaultIcon}
              eventHandlers={{
                click: () => setSelected(m),
              }}
            >
              <Popup>
                <SpotMapCoverImage marker={m} />
                <SpotMapLabel marker={m} />
                <p className="text-xs text-muted-foreground">{m.prefecture}</p>
                {m.visited && (
                  <Badge variant="success" className="mt-1 text-[10px]">
                    已打卡
                  </Badge>
                )}
                <Link href={`/spots/${m.id}`} className="mt-1 block text-xs text-primary hover:underline">
                  查看詳情
                </Link>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {selected && fullscreen && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] border-t border-border bg-background/95 p-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SpotMapLabel marker={selected} />
              <p className="text-sm text-muted-foreground">{selected.prefecture}</p>
              {selected.visited && (
                <Badge variant="success" className="mt-1">
                  已打卡
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSelected(null)}
              aria-label="關閉"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild className="mt-3 w-full">
            <Link href={`/spots/${selected.id}`}>查看聖地詳情</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}
