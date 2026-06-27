import { NextRequest, NextResponse } from "next/server";
import { db, travelogues, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { triggerTravelogueIndexing } from "@/lib/indexing";
import { handleTraveloguePublish } from "@/lib/travelogue-publish";
import { canEditTravelogue } from "@/lib/collaboration";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [result] = await db
    .select({ travelogue: travelogues, author: users })
    .from(travelogues)
    .innerJoin(users, eq(travelogues.userId, users.id))
    .where(eq(travelogues.slug, slug))
    .limit(1);

  if (!result) return NextResponse.json({ error: "找不到遊記" }, { status: 404 });

  return NextResponse.json(result);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { slug } = await params;
  const [existing] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.slug, slug))
    .limit(1);

  if (!existing || !(await canEditTravelogue(existing.id, session.user.id))) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const body = await req.json();
  const willPublish = body.isPublished ?? existing.isPublished;
  const isNewPublish = willPublish && !existing.isPublished;

  const [updated] = await db
    .update(travelogues)
    .set({
      title: body.title ?? existing.title,
      excerpt: body.excerpt ?? existing.excerpt,
      content: body.content ?? existing.content,
      seriesName: body.seriesName ?? existing.seriesName,
      seriesOrder: body.seriesOrder ?? existing.seriesOrder,
      isPublished: willPublish,
      publishedAt: isNewPublish ? new Date() : existing.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(travelogues.id, existing.id))
    .returning();

  if (isNewPublish) {
    await handleTraveloguePublish({
      userId: session.user.id,
      travelogueId: updated.id,
      slug: updated.slug,
      title: updated.title,
      content: updated.content,
      syncVisits: body.syncVisits,
    });
  } else {
    triggerTravelogueIndexing(updated.id);
  }

  return NextResponse.json(updated);
}
