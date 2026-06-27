import {
  db,
  bookmarks,
  spots,
  travelogues,
  anime,
} from "@seichi/db";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { AnimeTitles } from "@seichi/shared";

export interface BookmarkListItem {
  id: string;
  targetType: string;
  targetId: string;
  title: string;
  subtitle?: string;
  href?: string;
  imageUrl?: string | null;
  createdAt: string;
}

export async function getUserBookmarks(): Promise<BookmarkListItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const rows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, session.user.id))
    .orderBy(desc(bookmarks.createdAt));

  const items = await Promise.all(
    rows.map(async (bookmark) => {
      const base = {
        id: bookmark.id,
        targetType: bookmark.targetType,
        targetId: bookmark.targetId,
        createdAt: bookmark.createdAt.toISOString(),
      };

      switch (bookmark.targetType) {
        case "spot": {
          const [spot] = await db
            .select()
            .from(spots)
            .where(eq(spots.id, bookmark.targetId))
            .limit(1);
          return {
            ...base,
            title: spot?.nameZh ?? "聖地",
            subtitle: spot?.prefecture,
            href: spot ? `/spots/${spot.id}` : undefined,
            imageUrl: null,
          };
        }
        case "travelogue": {
          const [t] = await db
            .select()
            .from(travelogues)
            .where(eq(travelogues.id, bookmark.targetId))
            .limit(1);
          return {
            ...base,
            title: t?.title ?? "遊記",
            subtitle: t?.excerpt ?? undefined,
            href: t ? `/travelogue/${t.slug}` : undefined,
            imageUrl: null,
          };
        }
        case "anime": {
          const anilistId = Number(bookmark.targetId);
          const [a] = await db
            .select()
            .from(anime)
            .where(eq(anime.anilistId, anilistId))
            .limit(1);
          const titles = a?.titles as AnimeTitles | undefined;
          return {
            ...base,
            title:
              titles?.chinese ?? titles?.native ?? titles?.romaji ?? "動畫作品",
            href: `/anime/${anilistId}`,
            imageUrl: a?.coverImage ?? null,
          };
        }
        default:
          return { ...base, title: bookmark.targetId };
      }
    })
  );

  return items;
}
