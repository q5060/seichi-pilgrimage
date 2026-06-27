"use client";

import Link from "next/link";
import { Compass, Search, User, MapPin, Bookmark } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePendingPath } from "@/hooks/use-pending-path";
import { MobileMoreSheet } from "@/components/layout/mobile-more-sheet";

export function MobileTabBar() {
  const { isActive, onNavigate } = usePendingPath();
  const t = useTranslations("nav");

  const tabs = [
    { href: "/spots", label: t("explore"), icon: Compass },
    { href: "/spots/map", label: t("map"), icon: MapPin },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/bookmarks", label: t("bookmarks"), icon: Bookmark },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-subtle md:hidden">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={href === "/spots/map" ? false : undefined}
              onClick={() => onNavigate(href)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
              )}
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
        <MobileMoreSheet />
        <Link
          href="/users/me"
          onClick={() => onNavigate("/users/me")}
          className={cn(
            "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] transition-colors",
            isActive("/users/me")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {isActive("/users/me") && (
            <span className="absolute -top-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" />
          )}
          <User className="h-5 w-5 shrink-0" />
          <span className="truncate">{t("my")}</span>
        </Link>
      </div>
    </nav>
  );
}
