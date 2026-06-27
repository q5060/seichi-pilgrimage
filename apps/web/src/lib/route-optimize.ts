import { haversineDistance } from "./utils";

export interface RouteStopCoords {
  id: string;
  spotId: string;
  lat: number;
  lng: number;
  dayIndex: number;
}

function nearestNeighbor(stops: RouteStopCoords[]): RouteStopCoords[] {
  if (stops.length <= 1) return stops;

  const remaining = [...stops];
  const ordered: RouteStopCoords[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversineDistance(last.lat, last.lng, remaining[i].lat, remaining[i].lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  return ordered;
}

/** Nearest-neighbor TSP reorder for stops grouped by dayIndex */
export function optimizeStopsByDay(stops: RouteStopCoords[]): RouteStopCoords[] {
  const byDay = new Map<number, RouteStopCoords[]>();

  for (const stop of stops) {
    const day = stop.dayIndex ?? 1;
    const group = byDay.get(day) ?? [];
    group.push(stop);
    byDay.set(day, group);
  }

  const result: RouteStopCoords[] = [];
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    result.push(...nearestNeighbor(byDay.get(day)!));
  }

  return result;
}
