import { NextRequest, NextResponse } from "next/server";
import { db, lists, listItems, spots, activities } from "@seichi/db";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userLists = await db
    .select()
    .from(lists)
    .where(eq(lists.userId, session.user.id));

  return NextResponse.json(userLists);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const [list] = await db
    .insert(lists)
    .values({
      userId: session.user.id,
      title: body.title,
      description: body.description,
      listType: body.listType ?? "custom",
      isPublic: body.isPublic ?? true,
    })
    .returning();

  if (body.items?.length) {
    await db.insert(listItems).values(
      body.items.map((item: { spotId?: string; anilistId?: number; notes?: string }, i: number) => ({
        listId: list.id,
        spotId: item.spotId,
        anilistId: item.anilistId,
        notes: item.notes,
        sortOrder: i,
      }))
    );
  }

  await db.insert(activities).values({
    userId: session.user.id,
    type: "list",
    targetId: list.id,
    metadata: { title: list.title },
  });

  return NextResponse.json(list, { status: 201 });
}
