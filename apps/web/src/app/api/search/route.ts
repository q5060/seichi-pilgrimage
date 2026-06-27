import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { searchAll } from "@/lib/search";
import type { AppLocale } from "@/i18n/routing";
import { searchAndSyncAnime } from "@/lib/anime-sync";
import { db, spots, travelogues, users, photos } from "@seichi/db";
import { ilike, or, eq, and, sql } from "drizzle-orm";
import {
  enrichSpotsWithThumbnails,
  enrichTraveloguesWithCover,
} from "@/lib/thumbnails";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type");
  const prefecture = searchParams.get("prefecture");
  const hasComparison = searchParams.get("hasComparison") === "true";
  const season = searchParams.get("season");
  const isSensitive = searchParams.get("isSensitive");
  const hasPhotos = searchParams.get("hasPhotos") === "true";
  const cursor = Number(searchParams.get("cursor") ?? 0);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  if (!q && !prefecture && !hasComparison && !season && !isSensitive && !hasPhotos) {
    return NextResponse.json({
      spots: [],
      travelogues: [],
      anime: [],
      users: [],
      nextCursor: null,
    });
  }

  async function searchSpotsDb() {
    const conditions = [eq(spots.moderationStatus, "approved")];

    if (q) {
      conditions.push(
        or(
          ilike(spots.nameZh, `%${q}%`),
          ilike(spots.nameJa, `%${q}%`),
          ilike(spots.prefecture, `%${q}%`)
        )!
      );
    }
    if (prefecture) {
      conditions.push(eq(spots.prefecture, prefecture));
    }
    if (hasComparison) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${photos} WHERE ${photos.spotId} = ${spots.id} AND ${photos.isComparison} = true)`
      );
    }
    if (season) {
      conditions.push(sql`${spots.bestSeason} ILIKE ${"%" + season + "%"}`);
    }
    if (isSensitive === "false") {
      conditions.push(eq(spots.isSensitive, false));
    } else if (isSensitive === "true") {
      conditions.push(eq(spots.isSensitive, true));
    }
    if (hasPhotos) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM ${photos} WHERE ${photos.spotId} = ${spots.id})`
      );
    }

    const results = await db
      .select()
      .from(spots)
      .where(and(...conditions))
      .offset(cursor)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    return {
      items: await enrichSpotsWithThumbnails(results.slice(0, limit)),
      nextCursor: hasMore ? cursor + limit : null,
    };
  }

  async function searchTraveloguesDb() {
    const conditions = [eq(travelogues.isPublished, true)];
    if (q) {
      conditions.push(
        or(
          ilike(travelogues.title, `%${q}%`),
          ilike(travelogues.excerpt, `%${q}%`)
        )!
      );
    }

    const results = await db
      .select()
      .from(travelogues)
      .where(and(...conditions))
      .offset(cursor)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    return {
      items: enrichTraveloguesWithCover(results.slice(0, limit)),
      nextCursor: hasMore ? cursor + limit : null,
    };
  }

  async function searchUsersDb() {
    if (!q) return { items: [], nextCursor: null };
    const results = await db
      .select({ id: users.id, name: users.name, username: users.username, image: users.image })
      .from(users)
      .where(or(ilike(users.name, `%${q}%`), ilike(users.username, `%${q}%`))!)
      .offset(cursor)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    return { items: results.slice(0, limit), nextCursor: hasMore ? cursor + limit : null };
  }

  if (type === "spots") {
    const { items, nextCursor } = await searchSpotsDb();
    return NextResponse.json({ spots: items, nextCursor });
  }
  if (type === "travelogues") {
    const { items, nextCursor } = await searchTraveloguesDb();
    return NextResponse.json({ travelogues: items, nextCursor });
  }
  if (type === "users") {
    const { items, nextCursor } = await searchUsersDb();
    return NextResponse.json({ users: items, nextCursor });
  }
  if (type === "anime") {
    const animeResults = q
      ? await searchAndSyncAnime(q).catch(() => [])
      : [];
    const page = animeResults.slice(cursor, cursor + limit);
    const nextCursor =
      cursor + limit < animeResults.length ? cursor + limit : null;
    return NextResponse.json({ anime: page, nextCursor });
  }

  // All types
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: AppLocale = rawLocale === "ja" ? "ja" : "zh-TW";

  const meiliResults = q ? await searchAll(q, locale) : null;

  if (meiliResults && (meiliResults.spots.length > 0 || meiliResults.anime.length > 0)) {
    const [enrichedSpots, enrichedTravelogues] = await Promise.all([
      enrichSpotsWithThumbnails(
        meiliResults.spots.slice(cursor, cursor + limit) as { id: string }[]
      ),
      Promise.resolve(
        enrichTraveloguesWithCover(
          meiliResults.travelogues.slice(cursor, cursor + limit) as { content?: unknown }[]
        )
      ),
    ]);
    return NextResponse.json({
      spots: enrichedSpots,
      travelogues: enrichedTravelogues,
      anime: meiliResults.anime.slice(cursor, cursor + limit),
      users: meiliResults.users.slice(cursor, cursor + limit),
      nextCursor: cursor + limit,
    });
  }

  const [spotsRes, traveloguesRes, usersRes] = await Promise.all([
    searchSpotsDb(),
    searchTraveloguesDb(),
    searchUsersDb(),
  ]);
  const animeResults = q ? await searchAndSyncAnime(q).catch(() => []) : [];
  const animePage = animeResults.slice(cursor, cursor + limit);

  return NextResponse.json({
    spots: spotsRes.items,
    travelogues: traveloguesRes.items,
    anime: animePage,
    users: usersRes.items,
    nextCursor: cursor + limit,
    source: meiliResults && q ? "db_fallback" : "db",
  });
}
