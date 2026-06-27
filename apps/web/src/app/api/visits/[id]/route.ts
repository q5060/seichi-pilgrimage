import { NextRequest, NextResponse } from "next/server";
import { db, visits, spots, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { canViewContent, getFollowingIds } from "@/lib/privacy";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  const viewerId = session?.user?.id;

  const [result] = await db
    .select({ visit: visits, spot: spots, user: users })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .innerJoin(users, eq(visits.userId, users.id))
    .where(eq(visits.id, id))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "找不到打卡" }, { status: 404 });
  }

  const followingIds = viewerId ? await getFollowingIds(viewerId) : new Set<string>();
  const allowed = canViewContent(
    result.visit.privacy,
    result.visit.userId,
    viewerId,
    followingIds
  );

  if (!allowed) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  return NextResponse.json(result);
}
