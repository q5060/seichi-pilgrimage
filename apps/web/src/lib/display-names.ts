import type { AppLocale } from "@/i18n/routing";

export type SpotNameFields = {
  nameZh: string;
  nameJa?: string | null;
};

export type AnimeTitleFields = {
  chinese?: string;
  native?: string;
  romaji?: string;
  english?: string;
};

export function getSpotDisplayName(
  spot: SpotNameFields,
  locale: AppLocale = "zh-TW"
): string {
  if (locale === "ja") {
    return spot.nameJa || spot.nameZh;
  }
  return spot.nameZh || spot.nameJa || "";
}

export function getAnimeDisplayTitle(
  titles: AnimeTitleFields,
  locale: AppLocale = "zh-TW"
): string {
  if (locale === "ja") {
    return titles.native || titles.romaji || titles.chinese || titles.english || "未知作品";
  }
  return titles.chinese || titles.native || titles.romaji || titles.english || "未知作品";
}

export function getSpotSearchAttributes(locale: AppLocale): string[] {
  if (locale === "ja") {
    return ["nameJa", "nameZh", "prefecture", "address", "animeTitles"];
  }
  return ["nameZh", "nameJa", "prefecture", "address", "animeTitles"];
}

export function getAnimeSearchAttributes(locale: AppLocale): string[] {
  if (locale === "ja") {
    return ["titleNative", "titleRomaji", "titleChinese", "titleEnglish"];
  }
  return ["titleChinese", "titleNative", "titleRomaji", "titleEnglish"];
}
