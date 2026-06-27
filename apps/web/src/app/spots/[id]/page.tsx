import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ACCESS_TYPE_LABELS, SPOT_STATUS_LABELS, LOCATION_REPORT_LABELS } from "@seichi/shared";
import { formatDate, googleMapsPinUrl } from "@/lib/utils";
import { getSpotPageData } from "@/lib/spot-page";
import { getSocialReactionState } from "@/lib/social-status";
import { getSpotDisplayNameForRequest, getAnimeDisplayTitleForRequest } from "@/lib/display-names-server";
import { VisitForm } from "@/components/spots/visit-form";
import { LocationReportForm } from "@/components/spots/location-report-form";
import { PhotoUpload } from "@/components/spots/photo-upload";
import { AddToListButton } from "@/components/spots/add-to-list-button";
import { NearbySpotsButton } from "@/components/spots/nearby-spots-button";
import { SpotVersionHistory } from "@/components/spots/version-history";
import { ReportButton } from "@/components/report-button";
import { RegionFollowButton } from "@/components/follow-button";
import { SpotMobileActionBar } from "@/components/spots/spot-mobile-action-bar";
import { ContentSocialBar } from "@/components/social/content-social-bar";
import { LazyCommentThread } from "@/components/social/lazy-comment-thread";
import { SpotPhotoSection } from "@/components/spots/spot-photo-section";
import { SpotSimilarSection } from "@/components/spots/spot-similar-section";
import { CinematicHero } from "@/components/ui/cinematic-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { db, spots } from "@seichi/db";
import { eq } from "drizzle-orm";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [spot] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);

  if (!spot) return { title: "聖地" };

  const displayName = await getSpotDisplayNameForRequest(spot);
  const description = [
    spot.prefecture,
    spot.address,
    spot.nameJa,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${displayName} — 聖地巡禮`,
    description: description || undefined,
    openGraph: {
      title: displayName,
      description: description || undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: displayName,
      description: description || undefined,
    },
  };
}

export default async function SpotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [pageData, socialState] = await Promise.all([
    getSpotPageData(id),
    getSocialReactionState("spot", id, { includeHelpful: true, spotId: id }),
  ]);

  if (!pageData) notFound();

  const { spot, links, reports, versions, heroPhoto } = pageData;
  const displayName = await getSpotDisplayNameForRequest(spot);
  const secondaryName = displayName === spot.nameZh ? spot.nameJa : spot.nameZh;

  const linkTitles = await Promise.all(
    links.map(({ anime: a }) => getAnimeDisplayTitleForRequest(a.titles as { chinese?: string; native?: string; romaji?: string; english?: string }))
  );

  const displayLat = spot.isSensitive && spot.fuzzyLatitude ? spot.fuzzyLatitude : spot.latitude;
  const displayLng = spot.isSensitive && spot.fuzzyLongitude ? spot.fuzzyLongitude : spot.longitude;
  const mapsUrl = spot.googleMapsUrl ?? googleMapsPinUrl(displayLat, displayLng, displayName);
  const heroImageUrl = heroPhoto ? (heroPhoto.thumbnailUrl ?? heroPhoto.url) : null;
  const collageUrls = links
    .map(({ anime: a }) => a.coverImage)
    .filter((url): url is string => !!url);

  return (
    <div className="min-h-screen bg-background pb-32 lg:pb-0">
      <CinematicHero
        imageUrl={heroImageUrl}
        collageUrls={!heroImageUrl ? collageUrls : undefined}
        alt={displayName}
        height="lg"
      >
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="glass" size="sm" asChild>
                <Link href={`/spots/${id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  提案編輯
                </Link>
              </Button>
              <RegionFollowButton region={spot.prefecture} />
            </div>
            <ReportButton targetType="spot" targetId={id} />
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
              {displayName}
            </h1>
            {secondaryName && <p className="mt-1 text-lg text-muted-foreground">{secondaryName}</p>}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {spot.prefecture} · {spot.address}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="default">{ACCESS_TYPE_LABELS[spot.accessType]}</Badge>
            <Badge variant="secondary">{SPOT_STATUS_LABELS[spot.status]}</Badge>
            {spot.bestSeason && (
              <Badge variant="success">最佳季節：{spot.bestSeason}</Badge>
            )}
            {spot.lastConfirmedAt && (
              <Badge variant="success">最後確認：{formatDate(spot.lastConfirmedAt)}</Badge>
            )}
          </div>

          <Button variant="glass" asChild>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-4 w-4" />
              在 Google 地圖開啟
            </a>
          </Button>
          <div className="mt-4">
            <ContentSocialBar
              targetType="spot"
              targetId={id}
              link={`/spots/${id}`}
              showHelpful
              spotId={id}
              initialState={socialState}
            />
          </div>
        </div>
      </CinematicHero>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <Suspense
            fallback={
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                ))}
              </div>
            }
          >
            <SpotPhotoSection spotId={spot.id} />
          </Suspense>

          {spot.etiquetteNotes && (
            <Card className="border-warning/30 bg-warning/10">
                <CardContent className="p-4">
                  <h3 className="font-medium text-warning">禮儀提醒</h3>
                  <p className="mt-1 text-sm text-warning-foreground/80">{spot.etiquetteNotes}</p>
                </CardContent>
              </Card>
          )}

          <section>
            <SectionHeader title="相關作品" />
            <div className="space-y-3">
              {links.map(({ link, anime: a }, idx) => (
                <Link key={link.id} href={`/anime/${a.anilistId}`} className="group block">
                  <Card className="transition-all hover:border-primary/30 hover:shadow-glow-sm">
                    <CardContent className="flex items-center gap-3 p-3">
                      {a.coverImage && (
                        <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg">
                          <Image
                            src={a.coverImage}
                            alt={linkTitles[idx]}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium group-hover:text-primary">
                          {linkTitles[idx]}
                        </p>
                        {link.episode && (
                          <p className="text-sm text-muted-foreground">{link.episode}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {(spot.transportNotes ||
            spot.nearestStation ||
            spot.businessHours ||
            spot.osmUrl) && (
            <section>
              <SectionHeader title="交通資訊" />
              <Card>
                <CardContent className="space-y-1 p-4 text-sm">
                  {spot.nearestStation && (
                    <div>
                      <span className="font-medium">最近車站：</span>
                      {spot.nearestStation}
                    </div>
                  )}
                  {spot.walkMinutes && (
                    <div>
                      <span className="font-medium">步行：</span>約 {spot.walkMinutes} 分鐘
                    </div>
                  )}
                  {spot.suggestedStayMinutes && (
                    <div>
                      <span className="font-medium">建議停留：</span>
                      {spot.suggestedStayMinutes} 分鐘
                    </div>
                  )}
                  {spot.businessHours && (
                    <div>
                      <span className="font-medium">營業時間：</span>
                      {spot.businessHours}
                    </div>
                  )}
                  {spot.transportNotes && (
                    <p className="text-muted-foreground">{spot.transportNotes}</p>
                  )}
                  {spot.osmUrl && (
                    <a
                      href={spot.osmUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-primary hover:underline"
                    >
                      在 OpenStreetMap 查看
                    </a>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          {spot.alignmentDifficulty != null && (
            <section>
              <SectionHeader title="對位難度" />
              <Card>
                <CardContent className="p-4 text-sm">
                  <p>
                    {spot.alignmentDifficulty}/5
                    <span className="ml-2 text-muted-foreground">
                      （1 容易 · 5 困難）
                    </span>
                  </p>
                </CardContent>
              </Card>
            </section>
          )}

          {spot.isSensitive && (
            <Card className="border-muted bg-muted/30">
              <CardContent className="p-4 text-sm text-muted-foreground">
                此聖地座標已模糊顯示以保護隱私
              </CardContent>
            </Card>
          )}

          {spot.photoTips && (
            <section>
              <SectionHeader title="拍攝建議" />
              <Card>
                <CardContent className="space-y-1 p-4 text-sm">
                  <p>{spot.photoTips}</p>
                  {spot.bestTimeOfDay && (
                    <p className="text-muted-foreground">最佳時段：{spot.bestTimeOfDay}</p>
                  )}
                  {spot.focalLengthSuggestion && (
                    <p className="text-muted-foreground">焦段：{spot.focalLengthSuggestion}</p>
                  )}
                </CardContent>
              </Card>
            </section>
          )}

          <section>
            <SectionHeader title="編輯紀錄" />
            <SpotVersionHistory versions={versions} />
          </section>

          <section>
            <SectionHeader title="現況回報" />
            <div className="space-y-3">
              {reports.map(({ report, user }) => (
                <Card key={report.id}>
                  <CardContent className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
                          <AvatarFallback>
                            {user.name?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <span className="text-muted-foreground">{formatDate(report.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-primary">
                      {LOCATION_REPORT_LABELS[report.reportType as keyof typeof LOCATION_REPORT_LABELS] ?? report.reportType}
                    </p>
                    {report.notes && (
                      <p className="mt-1 text-muted-foreground">{report.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-4">
              <LocationReportForm spotId={spot.id} />
            </div>
          </section>

          <section>
            <SectionHeader title="討論" />
            <LazyCommentThread targetType="spot" targetId={id} link={`/spots/${id}`} />
          </section>

          <Suspense
            fallback={
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            }
          >
            <SpotSimilarSection spotId={id} />
          </Suspense>
        </div>

        <aside className="space-y-4">
          <div
            id="visit-form"
            className="scroll-mt-20 space-y-4 lg:sticky lg:top-20"
          >
            <VisitForm spotId={spot.id} spotName={displayName} />
            <div className="hidden lg:block space-y-4">
              <AddToListButton spotId={spot.id} />
              <NearbySpotsButton
                lat={displayLat}
                lng={displayLng}
                excludeId={spot.id}
                anilistIds={links.map(({ link }) => link.anilistId)}
              />
            </div>
            <PhotoUpload spotId={spot.id} />
            <Button variant="glass" className="hidden w-full lg:inline-flex" asChild>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-4 w-4" />
                在 Google 地圖開啟
              </a>
            </Button>
          </div>
        </aside>
      </div>

      <SpotMobileActionBar spotId={spot.id} mapsUrl={mapsUrl} />
    </div>
  );
}
