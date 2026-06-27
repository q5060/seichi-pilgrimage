import { NextRequest, NextResponse } from "next/server";
import { db, notifications } from "@seichi/db";
import { eq, desc, and, inArray, count, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 30),
    50
  );

  const conditions = [eq(notifications.userId, session.user.id)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  if (cursor) conditions.push(lt(notifications.createdAt, new Date(cursor)));

  const results = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = results.slice(0, limit);
  const last = items[items.length - 1];

  const [unreadRow] = await db
    .select({ count: count() })
    .from(notifications)
    .where(
      and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false))
    );

  const unreadCount = Number(unreadRow?.count ?? 0);

  return NextResponse.json({
    items,
    unreadCount,
    nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();

  if (body.markAllRead) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false))
      );
    return NextResponse.json({ success: true });
  }

  if (body.ids?.length) {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, session.user.id),
          inArray(notifications.id, body.ids)
        )
      );
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "無效請求" }, { status: 400 });
}
