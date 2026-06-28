import { NextRequest, NextResponse } from "next/server";
import { db, spots, spotHelpfulVotes } from "@seichi/db";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const [spot] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  if (!spot) return NextResponse.json({ error: "找不到聖地" }, { status: 404 });

  let voted = false;
  if (session?.user?.id) {
    const [vote] = await db
      .select()
      .from(spotHelpfulVotes)
      .where(
        and(eq(spotHelpfulVotes.spotId, id), eq(spotHelpfulVotes.userId, session.user.id))
      )
      .limit(1);
    voted = !!vote;
  }

  return NextResponse.json({ count: spot.helpfulCount, voted });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;

  const [spot] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  if (!spot) return NextResponse.json({ error: "找不到聖地" }, { status: 404 });

  const [existing] = await db
    .select()
    .from(spotHelpfulVotes)
    .where(
      and(eq(spotHelpfulVotes.spotId, id), eq(spotHelpfulVotes.userId, session.user.id))
    )
    .limit(1);

  if (existing) {
    await db
      .delete(spotHelpfulVotes)
      .where(
        and(eq(spotHelpfulVotes.spotId, id), eq(spotHelpfulVotes.userId, session.user.id))
      );
    await db
      .update(spots)
      .set({ helpfulCount: sql`GREATEST(${spots.helpfulCount} - 1, 0)` })
      .where(eq(spots.id, id));
    return NextResponse.json({ voted: false, count: Math.max(spot.helpfulCount - 1, 0) });
  }

  await db.insert(spotHelpfulVotes).values({
    spotId: id,
    userId: session.user.id,
  });
  await db
    .update(spots)
    .set({ helpfulCount: sql`${spots.helpfulCount} + 1` })
    .where(eq(spots.id, id));

  if (spot.createdById && spot.createdById !== session.user.id) {
    await createNotification({
      userId: spot.createdById,
      type: "helpful",
      copyKey: "helpful",
      copyVars: {
        actorName: session.user.name ?? "某位巡禮者",
        targetTitle: spot.nameZh,
      },
      link: `/spots/${id}`,
    });
  }

  return NextResponse.json({ voted: true, count: spot.helpfulCount + 1 });
}
