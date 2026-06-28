import { cacheFetch } from "@/lib/cache";
import { computeWrappedStats, type WrappedStats } from "@/lib/achievements";
import type { AppLocale } from "@/i18n/routing";

const WRAPPED_CACHE_TTL_MS = 120 * 1000;

export function getWrappedStats(
  userId: string,
  year: number,
  locale: AppLocale = "zh-TW"
): Promise<WrappedStats> {
  return cacheFetch(
    `wrapped:${userId}:${year}:${locale}`,
    () => computeWrappedStats(userId, year, locale),
    WRAPPED_CACHE_TTL_MS
  );
}
