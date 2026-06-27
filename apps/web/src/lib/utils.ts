import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function formatDate(date: Date | string, locale = "zh-TW"): string {
  const intlLocale = locale === "ja" ? "ja-JP" : "zh-TW";
  return new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

import type { AppLocale } from "@/i18n/routing";
import { getAnimeDisplayTitle } from "@/lib/display-names";

export function getAnimeTitle(
  titles: {
    chinese?: string;
    native?: string;
    romaji?: string;
    english?: string;
  },
  locale: AppLocale = "zh-TW"
): string {
  return getAnimeDisplayTitle(titles, locale);
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateRouteMetrics(
  stops: { lat: number; lng: number; stayMinutes?: number }[]
): { distanceM: number; minutes: number } {
  let distanceM = 0;
  let minutes = 0;
  for (let i = 0; i < stops.length; i++) {
    minutes += stops[i].stayMinutes ?? 30;
    if (i > 0) {
      const d = haversineDistance(
        stops[i - 1].lat,
        stops[i - 1].lng,
        stops[i].lat,
        stops[i].lng
      );
      distanceM += d;
      minutes += Math.ceil(d / 80); // ~80m/min walking
    }
  }
  return { distanceM: Math.round(distanceM), minutes };
}

export function googleMapsPinUrl(lat: number, lng: number, _label?: string): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function googleMapsDirectionsUrl(
  stops: { lat: number; lng: number }[]
): string {
  if (stops.length === 0) return "https://www.google.com/maps";
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints =
    stops.length > 2
      ? stops
          .slice(1, -1)
          .map((s) => `${s.lat},${s.lng}`)
          .join("|")
      : "";
  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "walking",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params}`;
}
