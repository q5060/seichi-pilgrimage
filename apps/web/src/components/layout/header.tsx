"use client";

import Link from "next/link";
import { MapPin, Search, BookOpen, User, Compass, Bookmark, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { cn } from "@/lib/utils";
import { usePendingPath } from "@/hooks/use-pending-path";

export function Header() {
  const { isActive, onNavigate } = usePendingPath();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  const navLinks = [
    { href: "/spots", label: t("exploreSpots"), icon: MapPin },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/travelogue", label: t("travelogue"), icon: BookOpen },
    { href: "/feed", label: t("feed"), icon: Compass },
    { href: "/leaderboard", label: t("leaderboard"), icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-subtle shadow-elevated">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold text-foreground transition-colors hover:text-primary"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
              <Compass className="h-5 w-5 text-primary" />
            </span>
            <span className="hidden sm:inline">{tc("siteName")}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={href === "/spots/map" ? false : undefined}
                  onClick={() => onNavigate(href)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "text-muted-foreground hover:bg-elevated hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher className="hidden h-9 w-[130px] text-xs sm:flex" />
          <NotificationBell />
          <Link
            href="/bookmarks"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-elevated/80 hover:text-foreground"
            aria-label={t("bookmarks")}
          >
            <Bookmark className="h-5 w-5" />
          </Link>
          <Link
            href="/users/me"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-elevated/80 hover:text-foreground"
            aria-label={t("profile")}
          >
            <User className="h-5 w-5" />
          </Link>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
