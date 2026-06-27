import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const { GET: getUser } = await import("../[id]/route");
  return getUser(req, { params: Promise.resolve({ id: "me" }) });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }
  const { PATCH: patchUser } = await import("../[id]/route");
  return patchUser(req);
}
