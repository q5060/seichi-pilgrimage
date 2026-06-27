import { NextRequest, NextResponse } from "next/server";
import { db, photos, users } from "@seichi/db";
import { eq, desc, and, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { saveUploadedImage, finalizeDirectUpload } from "@/lib/storage";
import { registerPhoto } from "@/lib/register-photo";
import { buildPrivacyFilter, getFollowingIds } from "@/lib/privacy";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  const session = await auth();
  const viewerId = session?.user?.id;
  const spotId = req.nextUrl.searchParams.get("spotId");
  const userId = req.nextUrl.searchParams.get("userId");
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const followingIds = viewerId ? [...(await getFollowingIds(viewerId))] : [];
  const conditions = [
    buildPrivacyFilter(photos.privacy, photos.userId, viewerId, followingIds),
  ];

  if (spotId) conditions.push(eq(photos.spotId, spotId));
  if (userId) conditions.push(eq(photos.userId, userId));
  if (cursor) conditions.push(lt(photos.createdAt, new Date(cursor)));

  const results = await db
    .select()
    .from(photos)
    .where(and(...conditions))
    .orderBy(desc(photos.createdAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = results.slice(0, limit);
  const last = items[items.length - 1];

  return NextResponse.json({
    items,
    nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const [user] = await db
    .select({ defaultPrivacy: users.defaultPrivacy })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (!body.storageKey) {
      return NextResponse.json({ error: "需要 storageKey" }, { status: 400 });
    }

    const saved = await finalizeDirectUpload(body.storageKey);
    const photo = await registerPhoto({
      userId: session.user.id,
      saved,
      spotId: body.spotId,
      visitId: body.visitId,
      caption: body.caption,
      isComparison: body.isComparison,
      comparisonScreenshotUrl: body.screenshotUrl,
      altText: body.altText,
      privacy: body.privacy ?? user?.defaultPrivacy ?? "public",
    });

    return NextResponse.json(photo, { status: 201 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "需要上傳檔案" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveUploadedImage(buffer, file.name);

  const isComparison = formData.get("isComparison") === "true";
  const privacy =
    (formData.get("privacy") as string) || user?.defaultPrivacy || "public";

  const photo = await registerPhoto({
    userId: session.user.id,
    saved,
    spotId: (formData.get("spotId") as string) || null,
    visitId: (formData.get("visitId") as string) || null,
    caption: (formData.get("caption") as string) || null,
    isComparison,
    comparisonScreenshotUrl: (formData.get("screenshotUrl") as string) || null,
    altText: (formData.get("altText") as string) || null,
    privacy: privacy as "public",
  });

  return NextResponse.json(photo, { status: 201 });
}
