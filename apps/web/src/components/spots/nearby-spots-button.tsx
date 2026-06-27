"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Film } from "lucide-react";
import { haversineDistance } from "@/lib/utils";

interface NearbySpot {
  id: string;
  nameZh: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  distance: number;
  source: "nearby" | "same_anime";
}

export function NearbySpotsButton({
  lat,
  lng,
  excludeId,
  anilistIds = [],
}: {
  lat: number;
  lng: number;
  excludeId: string;
  anilistIds?: number[];
}) {
  const [spots, setSpots] = useState<NearbySpot[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchNearby() {
    setLoading(true);
    setError("");
    try {
      const [nearbyRes, ...animeResults] = await Promise.all([
        fetch(`/api/spots/nearby?lat=${lat}&lng=${lng}&radius=3000`),
        ...anilistIds.map((aid) =>
          fetch(`/api/spots?anilistId=${aid}&limit=20`).then((r) => r.json())
        ),
      ]);

      const nearbyData = await nearbyRes.json();
      if (!nearbyRes.ok) {
        setError(nearbyData.error ?? "查詢失敗");
        return;
      }

      const byId = new Map<string, NearbySpot>();

      for (const s of nearbyData as Omit<NearbySpot, "distance" | "source">[]) {
        if (s.id === excludeId) continue;
        byId.set(s.id, {
          ...s,
          distance: haversineDistance(lat, lng, s.latitude, s.longitude),
          source: "nearby",
        });
      }

      for (const data of animeResults) {
        for (const s of data.items ?? []) {
          if (s.id === excludeId) continue;
          const dist = haversineDistance(lat, lng, s.latitude, s.longitude);
          const existing = byId.get(s.id);
          if (!existing || existing.source !== "nearby") {
            byId.set(s.id, {
              id: s.id,
              nameZh: s.nameZh,
              prefecture: s.prefecture,
              latitude: s.latitude,
              longitude: s.longitude,
              distance: dist,
              source: existing?.source === "nearby" ? "nearby" : "same_anime",
            });
          }
        }
      }

      const merged = [...byId.values()]
        .sort((a, b) => {
          if (a.source !== b.source) {
            return a.source === "nearby" ? -1 : 1;
          }
          return a.distance - b.distance;
        })
        .slice(0, 15);

      setSpots(merged);
      setOpen(true);
    } catch {
      setError("查詢失敗");
    } finally {
      setLoading(false);
    }
  }

  const nearbySpots = spots.filter((s) => s.source === "nearby" && s.distance <= 3000);
  const sameAnimeSpots = spots.filter((s) => s.source === "same_anime");

  return (
    <div>
      <button
        type="button"
        onClick={fetchNearby}
        disabled={loading}
        className="btn-secondary w-full text-sm"
      >
        <MapPin className="mr-2 h-4 w-4" />
        {loading ? "搜尋中..." : "附近與同作品聖地"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {open && spots.length > 0 && (
        <div className="card mt-3 max-h-72 overflow-y-auto p-2">
          {nearbySpots.length > 0 && (
            <>
              <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                3 公里內聖地
              </p>
              {nearbySpots.map((spot) => (
                <Link
                  key={spot.id}
                  href={`/spots/${spot.id}`}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-elevated"
                >
                  <span className="font-medium">{spot.nameZh}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {spot.prefecture} · {(spot.distance / 1000).toFixed(1)} km
                  </span>
                </Link>
              ))}
            </>
          )}
          {sameAnimeSpots.length > 0 && (
            <>
              <p className="mt-2 flex items-center gap-1 px-2 pb-2 text-xs font-medium text-muted-foreground">
                <Film className="h-3 w-3" />
                同作品聖地
              </p>
              {sameAnimeSpots.map((spot) => (
                <Link
                  key={spot.id}
                  href={`/spots/${spot.id}`}
                  className="block rounded-lg px-2 py-2 text-sm hover:bg-elevated"
                >
                  <span className="font-medium">{spot.nameZh}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {spot.prefecture} · {(spot.distance / 1000).toFixed(1)} km
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
      {open && spots.length === 0 && !error && (
        <p className="mt-2 text-sm text-muted-foreground">附近沒有其他聖地</p>
      )}
    </div>
  );
}
