import { NextRequest, NextResponse } from "next/server";
import { db, lists, listItems, spots, anime } from "@seichi/db";
import { eq, asc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getAnimeDisplayTitleForRequest } from "@/lib/display-names-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list) return NextResponse.json({ error: "找不到清單" }, { status: 404 });

  if (!list.isPublic && list.userId !== session?.user?.id) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const items = await db
    .select({ item: listItems, spot: spots, anime })
    .from(listItems)
    .leftJoin(spots, eq(listItems.spotId, spots.id))
    .leftJoin(anime, eq(listItems.anilistId, anime.anilistId))
    .where(eq(listItems.listId, id))
    .orderBy(asc(listItems.sortOrder));

  const enriched = await Promise.all(
    items.map(async (row) => ({
      ...row,
      animeTitle: row.anime
        ? await getAnimeDisplayTitleForRequest(row.anime.titles)
        : null,
    }))
  );

  return NextResponse.json({ list, items: enriched });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list) return NextResponse.json({ error: "找不到清單" }, { status: 404 });
  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const body = await req.json();

  if (body.addItem?.spotId) {
    const existing = await db
      .select()
      .from(listItems)
      .where(
        and(
          eq(listItems.listId, id),
          eq(listItems.spotId, body.addItem.spotId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "已在清單中" }, { status: 409 });
    }

    const allItems = await db
      .select({ sortOrder: listItems.sortOrder })
      .from(listItems)
      .where(eq(listItems.listId, id));

    const nextOrder = allItems.length > 0
      ? Math.max(...allItems.map((i) => i.sortOrder)) + 1
      : 0;

    const [item] = await db
      .insert(listItems)
      .values({
        listId: id,
        spotId: body.addItem.spotId,
        sortOrder: nextOrder,
        notes: body.addItem.notes,
      })
      .returning();

    return NextResponse.json({ item });
  }

  if (body.addItem?.anilistId) {
    const existing = await db
      .select()
      .from(listItems)
      .where(
        and(
          eq(listItems.listId, id),
          eq(listItems.anilistId, body.addItem.anilistId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "已在清單中" }, { status: 409 });
    }

    const allItems = await db
      .select({ sortOrder: listItems.sortOrder })
      .from(listItems)
      .where(eq(listItems.listId, id));

    const nextOrder = allItems.length > 0
      ? Math.max(...allItems.map((i) => i.sortOrder)) + 1
      : 0;

    const [item] = await db
      .insert(listItems)
      .values({
        listId: id,
        anilistId: body.addItem.anilistId,
        sortOrder: nextOrder,
        notes: body.addItem.notes,
      })
      .returning();

    return NextResponse.json({ item });
  }

  if (body.removeItemId) {
    await db
      .delete(listItems)
      .where(
        and(eq(listItems.id, body.removeItemId), eq(listItems.listId, id))
      );
    return NextResponse.json({ success: true });
  }

  if (body.updateItem?.id) {
    await db
      .update(listItems)
      .set({ notes: body.updateItem.notes ?? null })
      .where(
        and(eq(listItems.id, body.updateItem.id), eq(listItems.listId, id))
      );
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, id));
    return NextResponse.json({ success: true });
  }

  if (body.items?.length) {
    for (const item of body.items as { id: string; sortOrder: number }[]) {
      await db
        .update(listItems)
        .set({ sortOrder: item.sortOrder })
        .where(and(eq(listItems.id, item.id), eq(listItems.listId, id)));
    }
    await db
      .update(lists)
      .set({ updatedAt: new Date() })
      .where(eq(lists.id, id));
    return NextResponse.json({ success: true });
  }

  if (body.title || body.description !== undefined) {
    await db
      .update(lists)
      .set({
        title: body.title ?? list.title,
        description: body.description ?? list.description,
        isPublic: body.isPublic ?? list.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(lists.id, id));
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "無效請求" }, { status: 400 });
}
