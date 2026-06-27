import { NextRequest, NextResponse } from "next/server";
import { db, travelogues, travelogueCollaborators, users } from "@seichi/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { findUserByUsername } from "@/lib/collaboration";
import { createNotification } from "@/lib/notifications";

async function getTravelogue(slug: string) {
  const [row] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const travelogue = await getTravelogue(slug);
  if (!travelogue) {
    return NextResponse.json({ error: "找不到遊記" }, { status: 404 });
  }

  const rows = await db
    .select({
      userId: travelogueCollaborators.userId,
      role: travelogueCollaborators.role,
      user: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
      },
    })
    .from(travelogueCollaborators)
    .innerJoin(users, eq(travelogueCollaborators.userId, users.id))
    .where(eq(travelogueCollaborators.travelogueId, travelogue.id));

  return NextResponse.json({ collaborators: rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { slug } = await params;
  const travelogue = await getTravelogue(slug);
  if (!travelogue) {
    return NextResponse.json({ error: "找不到遊記" }, { status: 404 });
  }
  if (travelogue.userId !== session.user.id) {
    return NextResponse.json({ error: "僅作者可邀請協作者" }, { status: 403 });
  }

  const body = await req.json();
  const invitee = await findUserByUsername(body.username ?? "");
  if (!invitee) {
    return NextResponse.json({ error: "找不到使用者" }, { status: 404 });
  }
  if (invitee.id === session.user.id) {
    return NextResponse.json({ error: "無法邀請自己" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(travelogueCollaborators)
    .where(
      and(
        eq(travelogueCollaborators.travelogueId, travelogue.id),
        eq(travelogueCollaborators.userId, invitee.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "已是協作者" }, { status: 409 });
  }

  await db.insert(travelogueCollaborators).values({
    travelogueId: travelogue.id,
    userId: invitee.id,
    role: "editor",
  });

  await createNotification({
    userId: invitee.id,
    type: "travelogue",
    title: "遊記協作邀請",
    body: `你被邀請協作「${travelogue.title}」`,
    link: `/travelogue/${slug}/edit`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { slug } = await params;
  const travelogue = await getTravelogue(slug);
  if (!travelogue) {
    return NextResponse.json({ error: "找不到遊記" }, { status: 404 });
  }
  if (travelogue.userId !== session.user.id) {
    return NextResponse.json({ error: "僅作者可移除協作者" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.userId) {
    return NextResponse.json({ error: "無效請求" }, { status: 400 });
  }

  await db
    .delete(travelogueCollaborators)
    .where(
      and(
        eq(travelogueCollaborators.travelogueId, travelogue.id),
        eq(travelogueCollaborators.userId, body.userId)
      )
    );

  return NextResponse.json({ success: true });
}
