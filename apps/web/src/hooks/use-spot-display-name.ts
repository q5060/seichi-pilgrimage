"use client";

import { useLocale } from "next-intl";
import {
  getSpotDisplayName,
  type SpotNameFields,
} from "@/lib/display-names";
import type { AppLocale } from "@/i18n/routing";

export function useSpotDisplayName(spot: SpotNameFields): string {
  const locale = useLocale() as AppLocale;
  return getSpotDisplayName(spot, locale);
}
