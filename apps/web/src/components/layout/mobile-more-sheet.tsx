"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  MoreHorizontal,
  Route,
  Trophy,
  Bell,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePendingPath } from "@/hooks/use-pending-path";

const MORE_LINKS = [
  { href: "/feed", labelKey: "feed" as const, icon: Activity },
  { href: "/travelogue", labelKey: "travelogue" as const, icon: BookOpen },
  { href: "/leaderboard", labelKey: "leaderboard" as const, icon: Trophy },
  { href: "/routes", labelKey: "routes" as const, icon: Route },
  { href: "/notifications", labelKey: "notifications" as const, icon: Bell },
];

export function MobileMoreSheet() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isActive, onNavigate } = usePendingPath();
  const t = useTranslations("nav");

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, [open]);

  const moreActive = MORE_LINKS.some((l) => isActive(l.href));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-colors",
          moreActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label={t("more")}
      >
        {moreActive && (
          <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
        )}
        <MoreHorizontal className="h-5 w-5 shrink-0" />
        <span className="truncate">{t("more")}</span>
        {unreadCount > 0 && (
          <span className="absolute right-2 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label={t("closeMore")}
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t("more")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-elevated hover:text-foreground"
                aria-label={t("closeMore")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_LINKS.map(({ href, labelKey, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    onNavigate(href);
                    setOpen(false);
                  }}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-sm transition-colors",
                    isActive(href)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "hover:border-primary/20 hover:bg-elevated"
                  )}
                >
                  {href === "/notifications" && unreadCount > 0 && (
                    <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                  <Icon className="h-6 w-6" />
                  <span className="text-center text-xs font-medium">
                    {t(labelKey)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
