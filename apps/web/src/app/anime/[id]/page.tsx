import { db, spots, spotAnimeLinks, animePilgrimageMeta, travelogues, userAnimeStatus, photos, likes, users } from "@seichi/db";
import { eq, desc, and, sql, inArray, isNotNull } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { getAnimeDisplayTitleForRequest } from "@/lib/display-names-server";
import { getOrSyncAnime } from "@/lib/anime-sync";
import { getSocialReactionState } from "@/lib/social-status";
import { getSpotCoverPhotoUrls } from "@/lib/thumbnails";
import { ACCESS_TYPE_LABELS, SPOT_STATUS_LABELS } from "@seichi/shared";
import { AnimeStatusButton } from "@/components/anime/status-button";
import { AnimeFollowButton } from "@/components/follow-button";
import { ContentSocialBar } from "@/components/social/content-social-bar";
import { AnimeProgressBar } from "@/components/anime/progress-bar";
import { auth } from "@/lib/auth";
import { CinematicHero } from "@/components/ui/cinematic-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/ui/motion";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimeMetaEditForm } from "@/components/anime/meta-edit-form";
import { MapPin } from "lucide-react";
import { AnimeSpotMap } from "@/components/anime/anime-spot-map";
import { AddToListButton } from "@/components/spots/add-to-list-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Metadata } from "next";

export const revalidate = 60;

async function getRelatedTravelogues(anilistId: number, spotIds: string[]) {
  if (spotIds.length === 0) return [];

  return db
    .select()
    .from(travelogues)
    .where(
      and(
        eq(travelogues.isPublished, true),
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${travelogues.content}) AS block
          WHERE block->>'type' = 'spot_card'
          AND (
            (block->'data'->>'anilistId')::int = ${anilistId}
            OR (block->'data'->>'spotId')::uuid = ANY(ARRAY[${sql.join(
              spotIds.map((id) => sql`${id}::uuid`),
              sql`, `
            )}]::uuid[])
          )
        )`
      )
    )
    .orderBy(desc(travelogues.publishedAt))
    .limit(5);
}

async function getAnimePublicReviews(anilistId: number) {
  return db
    .select({
      review: userAnimeStatus.review,
      score: userAnimeStatus.score,
      updatedAt: userAnimeStatus.updatedAt,
      userId: users.id,
      userName: users.name,
      userImage: users.image,
    })
    .from(userAnimeStatus)
    .innerJoin(users, eq(userAnimeStatus.userId, users.id))
    .where(
      and(
        eq(userAnimeStatus.anilistId, anilistId),
        isNotNull(userAnimeStatus.review),
        sql`trim(${userAnimeStatus.review}) != ''`
      )
    )
    .orderBy(desc(userAnimeStatus.updatedAt))
    .limit(5);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const animeData = await getOrSyncAnime(Number(id));
  if (!animeData) return { title: "作品" };

  const title = await getAnimeDisplayTitleForRequest(animeData.titles);

  return {
    title: `${title} — 聖地巡禮`,
    description: animeData.description?.slice(0, 160) ?? undefined,
    openGraph: { title, type: "website" },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function AnimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anilistId = Number(id);

  const [animeData, session, socialState] = await Promise.all([
    getOrSyncAnime(anilistId),
    auth(),
    getSocialReactionState("anime", String(anilistId)),
  ]);
  if (!animeData) notFound();

  const userStatusPromise = session?.user?.id
    ? db
        .select()
        .from(userAnimeStatus)
        .where(
          and(
            eq(userAnimeStatus.userId, session.user.id),
            eq(userAnimeStatus.anilistId, anilistId)
          )
        )
        .limit(1)
    : Promise.resolve([]);

  const [metaRows, spotLinks, userStatusRows, publicReviews] = await Promise.all([
    db
      .select()
      .from(animePilgrimageMeta)
      .where(eq(animePilgrimageMeta.anilistId, anilistId))
      .limit(1),
    db
      .select({ spot: spots, link: spotAnimeLinks })
      .from(spotAnimeLinks)
      .innerJoin(spots, eq(spotAnimeLinks.spotId, spots.id))
      .where(eq(spotAnimeLinks.anilistId, anilistId)),
    userStatusPromise,
    getAnimePublicReviews(anilistId),
  ]);

  const meta = metaRows[0];
  const totalSpots = spotLinks.length;
  const visitedSpots = userStatusRows[0]?.visitedSpotCount ?? 0;

  const spotIds = spotLinks.map(({ spot }) => spot.id);

  const [relatedTravelogues, spotPhotoMap, comparisonPhotos] = await Promise.all([
    getRelatedTravelogues(anilistId, spotIds),
    spotIds.length > 0 ? getSpotCoverPhotoUrls(spotIds) : Promise.resolve(new Map()),
    spotIds.length > 0
      ? db
          .select()
          .from(photos)
          .where(and(inArray(photos.spotId, spotIds), eq(photos.isComparison, true)))
          .limit(20)
      : Promise.resolve([]),
  ]);

  let bestComparisons: {
    photo: (typeof photos.$inferSelect);
    spot: (typeof spots.$inferSelect);
    likeCount: number;
  }[] = [];

  if (comparisonPhotos.length > 0) {
    const photoIds = comparisonPhotos.map((p) => p.id);
    const likeCounts = await db
      .select({
        targetId: likes.targetId,
        count: sql<number>`count(*)::int`,
      })
      .from(likes)
      .where(and(eq(likes.targetType, "photo"), inArray(likes.targetId, photoIds)))
      .groupBy(likes.targetId);

    const likeMap = new Map(likeCounts.map((l) => [l.targetId, l.count]));
    const spotMap = new Map(spotLinks.map(({ spot }) => [spot.id, spot]));

    bestComparisons = comparisonPhotos
      .map((photo) => ({
        photo,
        spot: photo.spotId ? spotMap.get(photo.spotId) : undefined,
        likeCount: likeMap.get(photo.id) ?? 0,
      }))
      .filter((c): c is typeof c & { spot: NonNullable<typeof c.spot> } => !!c.spot)
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 6);
  }

  const title = await getAnimeDisplayTitleForRequest(animeData.titles);

  return (
    <div className="min-h-screen bg-background">
      <CinematicHero
        imageUrl={animeData.coverImage}
        alt={title}
        height="lg"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 md:flex-row md:items-end">
          {animeData.coverImage && (
            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-border shadow-glow-sm md:hidden">
              <Image
                src={animeData.coverImage}
                alt={title}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          )}
          {animeData.coverImage && (
            <div className="relative hidden h-48 w-32 shrink-0 overflow-hidden rounded-xl border border-border shadow-glow-sm md:block lg:h-56 lg:w-40">
              <Image
                src={animeData.coverImage}
                alt={title}
                fill
                className="object-cover"
                sizes="160px"
              />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                {animeData.episodes && `${animeData.episodes} 話`}
                {animeData.seasonYear && ` · ${animeData.seasonYear}`}
                {animeData.averageScore && ` · 評分 ${animeData.averageScore}`}
                {animeData.format && ` · ${animeData.format}`}
              </p>
              {animeData.genres && animeData.genres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {animeData.genres.slice(0, 6).map((g) => (
                    <Badge key={g} variant="secondary">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}
              {animeData.description && (
                <p className="mt-3 line-clamp-3 max-w-2xl text-sm text-muted-foreground md:line-clamp-none">
                  {animeData.description.replace(/<[^>]*>/g, "")}
                </p>
              )}
              {meta?.suggestedDays && (
                <p className="mt-2 text-sm text-primary">
                  建議巡禮天數：{meta.suggestedDays} 天
                </p>
              )}
            </div>

            <AnimeProgressBar
              visited={visitedSpots}
              total={totalSpots}
              isLoggedIn={!!session?.user?.id}
            />

            <div className="flex flex-wrap items-center gap-3">
              <AnimeFollowButton anilistId={anilistId} />
              <AddToListButton anilistId={anilistId} iconOnly />
              <ContentSocialBar
                targetType="anime"
                targetId={String(anilistId)}
                link={`/anime/${anilistId}`}
                initialState={socialState}
              />
              <Button variant="glass" asChild>
                <Link href={`/anime/${anilistId}/discuss`}>討論板</Link>
              </Button>
            </div>
          </div>
        </div>
      </CinematicHero>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10">
        {meta?.etiquetteNotes && (
          <FadeIn>
            <Card className="border-warning/30 bg-warning/10">
              <CardContent className="p-4 text-sm text-warning-foreground">
                {meta.etiquetteNotes}
              </CardContent>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={0.05}>
          <AnimeStatusButton anilistId={anilistId} />
        </FadeIn>

        {publicReviews.length > 0 && (
          <FadeIn delay={0.06}>
            <section>
              <SectionHeader title="巡禮心得" />
              <div className="mt-4 space-y-3">
                {publicReviews.map((entry) => (
                  <Card key={`${entry.userId}-${entry.updatedAt}`} className="p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/users/${entry.userId}`}>
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={entry.userImage ?? undefined} />
                          <AvatarFallback>
                            {entry.userName?.slice(0, 1) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/users/${entry.userId}`}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {entry.userName}
                          </Link>
                          {entry.score != null && (
                            <Badge variant="secondary">{entry.score}/10</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.updatedAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {entry.review}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </FadeIn>
        )}

        {session?.user?.id && (
          <FadeIn delay={0.08}>
            <AnimeMetaEditForm
              anilistId={anilistId}
              initial={{
                suggestedDays: meta?.suggestedDays,
                etiquetteNotes: meta?.etiquetteNotes,
                customTitle: meta?.customTitle,
              }}
            />
          </FadeIn>
        )}

        <section>
          <SectionHeader title={`聖地列表（${spotLinks.length} 處）`} />
          {spotLinks.length > 0 && <AnimeSpotMap anilistId={anilistId} />}
          <div className="mt-6">
          {spotLinks.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="尚無登錄聖地"
              description="此作品的地點資訊仍在收集中"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {spotLinks.map(({ spot, link }) => {
                const thumbnail = spotPhotoMap.get(spot.id) ?? undefined;
                return (
                  <FadeIn key={spot.id}>
                    <Link href={`/spots/${spot.id}`} className="group block">
                      <Card className="overflow-hidden transition-all hover:border-primary/30 hover:shadow-glow-sm">
                        <div className="flex gap-0">
                          {thumbnail && (
                            <div className="relative h-28 w-28 shrink-0 overflow-hidden">
                              <Image
                                src={thumbnail}
                                alt={spot.nameZh}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="112px"
                              />
                            </div>
                          )}
                          <CardContent className={`flex flex-1 flex-col justify-center p-4 ${!thumbnail ? "" : ""}`}>
                            <h3 className="font-semibold group-hover:text-primary">{spot.nameZh}</h3>
                            <p className="text-sm text-muted-foreground">{spot.prefecture}</p>
                            {link.episode && (
                              <p className="mt-1 text-xs text-primary">{link.episode}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                {ACCESS_TYPE_LABELS[spot.accessType]}
                              </Badge>
                              <Badge variant="outline">
                                {SPOT_STATUS_LABELS[spot.status]}
                              </Badge>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    </Link>
                  </FadeIn>
                );
              })}
            </div>
          )}
          </div>
        </section>

        {bestComparisons.length > 0 && (
          <section>
            <SectionHeader title="最佳對比照" />
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-thin">
              {bestComparisons.map(({ photo, spot, likeCount }) => (
                <Link
                  key={photo.id}
                  href={`/spots/${spot.id}`}
                  className="group w-72 shrink-0 snap-start"
                >
                  <Card className="overflow-hidden transition-all hover:border-primary/30 hover:shadow-glow-sm">
                    <div className="grid grid-cols-2 gap-0.5">
                      {photo.comparisonScreenshotUrl ? (
                        <div className="relative aspect-square overflow-hidden">
                          <Image
                            src={photo.comparisonScreenshotUrl}
                            alt="截圖"
                            fill
                            className="object-cover"
                            sizes="144px"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-elevated text-xs text-muted-foreground">
                          截圖
                        </div>
                      )}
                      <div className="relative aspect-square overflow-hidden">
                        <Image
                          src={photo.thumbnailUrl ?? photo.url}
                          alt="實拍"
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="144px"
                        />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium group-hover:text-primary">{spot.nameZh}</p>
                      <p className="text-xs text-muted-foreground">{likeCount} 個讚</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {relatedTravelogues.length > 0 && (
          <section>
            <SectionHeader title="相關遊記" />
            <div className="space-y-3">
              {relatedTravelogues.map((t) => (
                <FadeIn key={t.id}>
                  <Link href={`/travelogue/${t.slug}`} className="group block">
                    <Card className="p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                      <h3 className="font-medium group-hover:text-primary">{t.title}</h3>
                      {t.publishedAt && (
                        <p className="text-sm text-muted-foreground">{formatDate(t.publishedAt)}</p>
                      )}
                    </Card>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
