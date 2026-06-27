import { NextRequest, NextResponse } from "next/server";
import { getSocialBatchStatus, type SocialBatchTarget } from "@/lib/social-status";
import type { ReactionTarget } from "@seichi/shared";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("targets");
  if (!raw) {
    return NextResponse.json({ error: "需要 targets 參數" }, { status: 400 });
  }

  const targets: SocialBatchTarget[] = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [targetType, targetId, ...rest] = part.split(":");
      const includeHelpful = rest.includes("helpful");
      return {
        targetType: targetType as ReactionTarget,
        targetId,
        includeHelpful,
        spotId: includeHelpful ? targetId : undefined,
      };
    })
    .filter((t) => t.targetType && t.targetId);

  const states = await getSocialBatchStatus(targets);
  return NextResponse.json({ states });
}
