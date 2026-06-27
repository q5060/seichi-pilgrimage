import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "總覽" },
  { id: "anime", label: "巡禮作品" },
  { id: "visits", label: "打卡" },
  { id: "travelogues", label: "遊記" },
  { id: "lists", label: "清單" },
] as const;

export type ProfileTab = (typeof TABS)[number]["id"];

export function ProfileTabNav({
  userId,
  activeTab,
}: {
  userId: string;
  activeTab: ProfileTab;
}) {
  return (
    <nav className="mt-8 border-b border-border">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/users/${userId}?tab=${tab.id}`}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
