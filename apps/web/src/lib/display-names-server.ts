import { cookies } from "next/headers";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  getSpotDisplayName,
  getAnimeDisplayTitle,
  type SpotNameFields,
  type AnimeTitleFields,
} from "@/lib/display-names";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("NEXT_LOCALE")?.value;
  return raw === "ja" || raw === "zh-TW" ? raw : routing.defaultLocale;
}

export async function getSpotDisplayNameForRequest(
  spot: SpotNameFields
): Promise<string> {
  const locale = await getRequestLocale();
  return getSpotDisplayName(spot, locale);
}

export async function getAnimeDisplayTitleForRequest(
  titles: AnimeTitleFields
): Promise<string> {
  const locale = await getRequestLocale();
  return getAnimeDisplayTitle(titles, locale);
}
