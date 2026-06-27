import { NextRequest, NextResponse } from "next/server";
import { db, routes, routeCollaborators } from "@seichi/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { createHmac, timingSafeEqual } from "crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signInvite(routeId: string) {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  const exp = Date.now() + INVITE_TTL_MS;
  const payload = `${routeId}:${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

function verifyInvite(token: string, routeId: string): boolean {
  try {
    const secret = process.env.AUTH_SECRET ?? "dev-secret";
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return false;
    const sig = decoded.slice(lastColon + 1);
    const payload = decoded.slice(0, lastColon);
    const [rid, expStr] = payload.split(":");
    if (rid !== routeId) return false;
    if (Number(expStr) < Date.now()) return false;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) {
    return NextResponse.json({ error: "找不到路線" }, { status: 404 });
  }
  if (route.userId !== session.user.id) {
    return NextResponse.json({ error: "僅擁有者可產生邀請連結" }, { status: 403 });
  }

  const token = signInvite(id);
  const inviteUrl = `/routes/${id}/join?token=${token}`;
  return NextResponse.json({ token, inviteUrl });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const token = body.token as string;
  if (!token || !verifyInvite(token, id)) {
    return NextResponse.json({ error: "邀請連結無效或已過期" }, { status: 404 });
  }

  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) {
    return NextResponse.json({ error: "找不到路線" }, { status: 404 });
  }

  if (route.userId === session.user.id) {
    return NextResponse.json({ success: true, alreadyMember: true });
  }

  const [existing] = await db
    .select()
    .from(routeCollaborators)
    .where(
      and(
        eq(routeCollaborators.routeId, id),
        eq(routeCollaborators.userId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ success: true, alreadyMember: true });
  }

  await db.insert(routeCollaborators).values({
    routeId: id,
    userId: session.user.id,
  });

  await createNotification({
    userId: route.userId,
    type: "route",
    title: "路線協作邀請已接受",
    body: `有人透過邀請連結加入「${route.title}」`,
    link: `/routes/${id}`,
  });

  return NextResponse.json({ success: true });
}
