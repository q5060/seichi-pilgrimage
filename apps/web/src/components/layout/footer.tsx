import Link from "next/link";
import { Compass } from "lucide-react";

const exploreLinks = [
  { href: "/spots", label: "探索聖地" },
  { href: "/search", label: "搜尋" },
  { href: "/travelogue", label: "遊記" },
  { href: "/feed", label: "動態" },
  { href: "/leaderboard", label: "排行榜" },
];

const legalLinks = [
  { href: "/terms", label: "使用條款" },
  { href: "/privacy", label: "隱私政策" },
  { href: "/copyright", label: "版權聲明" },
];

export function Footer() {
  return (
    <footer className="hidden border-t border-subtle bg-surface/50 md:block">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/20">
                <Compass className="h-4 w-4 text-primary" />
              </span>
              聖地巡禮
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              動畫聖地社群，記錄你的巡禮足跡、分享遊記、探索日本取景地。
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">探索</h3>
            <ul className="mt-3 space-y-2">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">法律與政策</h3>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-subtle pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} 聖地巡禮 — 動畫聖地社群
        </div>
      </div>
    </footer>
  );
}
