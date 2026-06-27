import { db, visits, spots, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { canViewContent, getFollowingIds } from "@/lib/privacy";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [result] = await db
    .select({ visit: visits, spot: spots })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .where(eq(visits.id, id))
    .limit(1);

  if (!result) return { title: "打卡" };

  return {
    title: `${result.spot.nameZh} 打卡 — 聖地巡禮`,
    description: result.visit.notes?.slice(0, 160) ?? `在 ${result.spot.nameZh} 的巡禮打卡`,
    openGraph: { title: `${result.spot.nameZh} 打卡`, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function VisitSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  if (!result) notFound();

  const followingIds = viewerId ? await getFollowingIds(viewerId) : new Set<string>();
  if (
    !canViewContent(
      result.visit.privacy,
      result.visit.userId,
      viewerId,
      followingIds
    )
  ) {
    notFound();
  }

  const { visit, spot, user } = result;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-background via-primary/10 to-background p-6">
          <p className="text-sm font-medium text-primary">聖地巡禮 · 打卡分享</p>
          <h1 className="mt-2 font-display text-2xl font-bold">{spot.nameZh}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {spot.prefecture}
          </p>
        </div>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback>{(user.name ?? "?")[0]}</AvatarFallback>
            </Avatar>
            <div>
              <Link href={`/users/${user.id}`} className="font-medium hover:text-primary">
                {user.name ?? user.username}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDate(visit.visitedAt.toISOString())}
              </p>
            </div>
            {visit.rating != null && (
              <Badge variant="secondary" className="ml-auto gap-1">
                <Star className="h-3 w-3" />
                {visit.rating}/10
              </Badge>
            )}
          </div>

          {visit.notes && (
            <p className="text-sm text-muted-foreground">{visit.notes}</p>
          )}

          <Button asChild className="w-full">
            <Link href={`/spots/${spot.id}`}>查看聖地</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
