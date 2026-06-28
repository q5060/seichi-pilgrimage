import { db, travelogues, users } from "@seichi/db";
import { eq, and } from "drizzle-orm";
import { cacheFetch } from "@/lib/cache";

const TRAVELOGUE_CACHE_TTL_MS = 60 * 1000;

export async function getPublishedTravelogue(slug: string) {
  return cacheFetch(`travelogue:published:${slug}`, async () => {
    const [row] = await db
      .select({
        travelogue: travelogues,
        author: users,
      })
      .from(travelogues)
      .innerJoin(users, eq(travelogues.userId, users.id))
      .where(
        and(eq(travelogues.slug, slug), eq(travelogues.isPublished, true))
      )
      .limit(1);

    return row ?? null;
  }, TRAVELOGUE_CACHE_TTL_MS);
}
