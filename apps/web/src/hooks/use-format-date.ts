import { useLocale } from "next-intl";
import { formatDate } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

export function useFormatDate() {
  const locale = useLocale() as AppLocale;
  return (date: Date | string) => formatDate(date, locale);
}
