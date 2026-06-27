import { NextRequest, NextResponse } from "next/server";
import { db, travelogues, activities, spotAnimeLinks } from "@seichi/db";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { grantAchievement } from "@/lib/achievements";
import { triggerTravelogueIndexing } from "@/lib/indexing";
import { enrichTraveloguesWithCover } from "@/lib/thumbnails";

export async function GET(req: NextRequest) {
  const published = req.nextUrl.searchParams.get("published") !== "false";
  const anilistId = req.nextUrl.searchParams.get("anilistId");
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);

  if (anilistId) {
    const links = await db
      .select({ spotId: spotAnimeLinks.spotId })
      .from(spotAnimeLinks)
      .where(eq(spotAnimeLinks.anilistId, Number(anilistId)));

    const spotIds = links.map((l) => l.spotId);
    if (spotIds.length === 0) {
      return NextResponse.json({ items: [], nextCursor: null });
    }

    const conditions = [
      published ? eq(travelogues.isPublished, true) : undefined,
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements(${travelogues.content}) AS block
        WHERE block->>'type' = 'spot_card'
        AND (
          (block->'data'->>'anilistId')::int = ${Number(anilistId)}
          OR (block->'data'->>'spotId')::uuid = ANY(ARRAY[${sql.join(
            spotIds.map((id) => sql`${id}::uuid`),
            sql`, `
          )}]::uuid[])
        )
      )`,
      cursor ? lt(travelogues.publishedAt, new Date(cursor)) : undefined,
    ].filter(Boolean);

    const results = await db
      .select()
      .from(travelogues)
      .where(and(...conditions))
      .orderBy(desc(travelogues.publishedAt))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const page = results.slice(0, limit);
    const enriched = enrichTraveloguesWithCover(page);
    const last = page[page.length - 1];

    return NextResponse.json({
      items: enriched,
      nextCursor:
        hasMore && last?.publishedAt
          ? last.publishedAt.toISOString()
          : null,
    });
  }

  const conditions = [];
  if (published) conditions.push(eq(travelogues.isPublished, true));
  if (cursor) conditions.push(lt(travelogues.publishedAt, new Date(cursor)));

  let q = db.select().from(travelogues).$dynamic();
  if (conditions.length > 0) {
    q = q.where(and(...conditions));
  }

  const results = await q
    .orderBy(desc(travelogues.publishedAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const page = results.slice(0, limit);
  const enriched = enrichTraveloguesWithCover(page);
  const last = page[page.length - 1];

  return NextResponse.json({
    items: enriched,
    nextCursor:
      hasMore && last?.publishedAt
        ? last.publishedAt.toISOString()
        : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const slug = body.slug || slugify(body.title) + "-" + Date.now().toString(36);

  const [travelogue] = await db
    .insert(travelogues)
    .values({
      userId: session.user.id,
      title: body.title,
      slug,
      excerpt: body.excerpt,
      content: body.content ?? [],
      seriesName: body.seriesName,
      seriesOrder: body.seriesOrder,
      isPublished: body.isPublished ?? false,
      privacy: body.privacy ?? "public",
      publishedAt: body.isPublished ? new Date() : null,
    })
    .returning();

  if (body.isPublished) {
    await grantAchievement(session.user.id, "first_travelogue");
    await db.insert(activities).values({
      userId: session.user.id,
      type: "travelogue",
      targetId: travelogue.id,
      metadata: { slug: travelogue.slug },
    });
    triggerTravelogueIndexing(travelogue.id);
  }

  return NextResponse.json(travelogue, { status: 201 });
}
