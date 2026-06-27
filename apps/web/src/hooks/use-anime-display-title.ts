"use client";

import { useLocale } from "next-intl";
import {
  getAnimeDisplayTitle,
  type AnimeTitleFields,
} from "@/lib/display-names";
import type { AppLocale } from "@/i18n/routing";

export function useAnimeDisplayTitle(titles: AnimeTitleFields): string {
  const locale = useLocale() as AppLocale;
  return getAnimeDisplayTitle(titles, locale);
}
