import { NextRequest, NextResponse } from "next/server";
import { db, routes, routeCollaborators, users } from "@seichi/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { findUserByUsername } from "@/lib/collaboration";
import { createNotification } from "@/lib/notifications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await db
    .select({
      userId: routeCollaborators.userId,
      user: {
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
      },
    })
    .from(routeCollaborators)
    .innerJoin(users, eq(routeCollaborators.userId, users.id))
    .where(eq(routeCollaborators.routeId, id));

  return NextResponse.json({ collaborators: rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) {
    return NextResponse.json({ error: "找不到路線" }, { status: 404 });
  }
  if (route.userId !== session.user.id) {
    return NextResponse.json({ error: "僅擁有者可邀請協作者" }, { status: 403 });
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
    .from(routeCollaborators)
    .where(
      and(
        eq(routeCollaborators.routeId, id),
        eq(routeCollaborators.userId, invitee.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "已是協作者" }, { status: 409 });
  }

  await db.insert(routeCollaborators).values({
    routeId: id,
    userId: invitee.id,
  });

  await createNotification({
    userId: invitee.id,
    type: "route",
    title: "路線協作邀請",
    body: `你被邀請協作「${route.title}」`,
    link: `/routes/${id}`,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) {
    return NextResponse.json({ error: "找不到路線" }, { status: 404 });
  }
  if (route.userId !== session.user.id) {
    return NextResponse.json({ error: "僅擁有者可移除協作者" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.userId) {
    return NextResponse.json({ error: "無效請求" }, { status: 400 });
  }

  await db
    .delete(routeCollaborators)
    .where(
      and(
        eq(routeCollaborators.routeId, id),
        eq(routeCollaborators.userId, body.userId)
      )
    );

  return NextResponse.json({ success: true });
}
