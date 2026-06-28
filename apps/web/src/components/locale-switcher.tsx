"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppLocale } from "@/i18n/routing";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    void fetch("/api/users/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {
      // cookie still applies for anonymous users
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <Select value={locale} onValueChange={onChange} disabled={pending}>
      <SelectTrigger className={className ?? "w-[140px]"} aria-label={t("language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="zh-TW">{t("zhTW")}</SelectItem>
        <SelectItem value="ja">{t("ja")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
