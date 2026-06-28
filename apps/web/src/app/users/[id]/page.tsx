import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  db,
  users,
  visits,
  spots,
  travelogues,
  lists,
  userAnimeStatus,
  anime,
  animePilgrimageMeta,
  activities,
} from "@seichi/db";
import { eq, desc, and } from "drizzle-orm";
import {
  MapPin,
  Trophy,
  Footprints,
  Globe,
  CheckCircle,
  BookOpen,
  MessageSquare,
  Shield,
  Camera,
  Sparkles,
  List,
} from "lucide-react";
import { getProfileSummary } from "@/lib/profile-data";
import { getWrappedStats } from "@/lib/wrapped-data";
import { JapanMap } from "@/components/profile/japan-map";
import { ProfileTabNav, type ProfileTab } from "@/components/profile/profile-tab-nav";
import { AnimeListTable } from "@/components/profile/anime-list-table";
import { FormattedDate } from "@/components/ui/formatted-date";
import { FollowButton } from "@/components/social/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CinematicHero } from "@/components/ui/cinematic-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { StatPill } from "@/components/ui/stat-pill";
import { FadeIn } from "@/components/ui/motion";
import { PageShell } from "@/components/layout/page-shell";
import {
  PILGRIMAGE_STATUSES,
  PILGRIMAGE_STATUS_LABELS,
  type AchievementId,
  type PilgrimageStatus,
} from "@seichi/shared";

export const revalidate = 60;

const ACHIEVEMENT_ICONS: Record<AchievementId, typeof Trophy> = {
  first_visit: MapPin,
  ten_spots: Footprints,
  fifty_spots: Trophy,
  prefecture_5: MapPin,
  prefecture_10: Globe,
  anime_complete: CheckCircle,
  first_travelogue: BookOpen,
  contributor_10: MessageSquare,
  contributor_50: Shield,
  photo_comparison: Camera,
};

const VALID_TABS = new Set<ProfileTab>([
  "overview",
  "anime",
  "visits",
  "travelogues",
  "lists",
]);

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; wrapped?: string; status?: string }>;
}) {
  const { id } = await params;
  const { wrapped: wrappedYear, tab: tabParam, status: statusParam } =
    await searchParams;
  const session = await auth();

  let userId = id;
  if (id === "me") {
    if (!session?.user?.id) redirect("/auth/signin");
    userId = session.user.id;
  }

  const activeTab: ProfileTab = VALID_TABS.has(tabParam as ProfileTab)
    ? (tabParam as ProfileTab)
    : "overview";

  const statusFilter =
    statusParam && PILGRIMAGE_STATUSES.includes(statusParam as PilgrimageStatus)
      ? (statusParam as PilgrimageStatus)
      : "all";

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) redirect("/");

  const isOwn = session?.user?.id === userId;
  const currentYear = new Date().getFullYear();

  const [
    profileSummary,
    visitList,
    userTravelogues,
    userLists,
    contributionActivities,
    animeRows,
  ] = await Promise.all([
    getProfileSummary(userId),
    activeTab === "visits" || activeTab === "overview"
      ? db
          .select({ visit: visits, spot: spots })
          .from(visits)
          .innerJoin(spots, eq(visits.spotId, spots.id))
          .where(eq(visits.userId, userId))
          .orderBy(desc(visits.visitedAt))
          .limit(activeTab === "visits" ? 50 : 10)
      : Promise.resolve([]),
    activeTab === "travelogues"
      ? db
          .select()
          .from(travelogues)
          .where(
            isOwn
              ? eq(travelogues.userId, userId)
              : and(
                  eq(travelogues.userId, userId),
                  eq(travelogues.isPublished, true),
                  eq(travelogues.privacy, "public")
                )
          )
          .orderBy(desc(travelogues.updatedAt))
          .limit(50)
      : Promise.resolve([]),
    activeTab === "lists"
      ? db
          .select()
          .from(lists)
          .where(
            isOwn
              ? eq(lists.userId, userId)
              : and(eq(lists.userId, userId), eq(lists.isPublic, true))
          )
          .orderBy(desc(lists.updatedAt))
      : Promise.resolve([]),
    activeTab === "overview"
      ? db
          .select()
          .from(activities)
          .where(eq(activities.userId, userId))
          .orderBy(desc(activities.createdAt))
          .limit(20)
      : Promise.resolve([]),
    activeTab === "anime"
      ? db
          .select({
            status: userAnimeStatus,
            anime: anime,
            spotCount: animePilgrimageMeta.spotCount,
          })
          .from(userAnimeStatus)
          .innerJoin(anime, eq(userAnimeStatus.anilistId, anime.anilistId))
          .leftJoin(
            animePilgrimageMeta,
            eq(userAnimeStatus.anilistId, animePilgrimageMeta.anilistId)
          )
          .where(eq(userAnimeStatus.userId, userId))
          .orderBy(desc(userAnimeStatus.updatedAt))
      : Promise.resolve([]),
  ]);

  const { visitCount, travelogueCount, prefectureList, achievements } =
    profileSummary;

  let wrapped = null;
  if (wrappedYear) {
    try {
      wrapped = await getWrappedStats(userId, Number(wrappedYear));
    } catch {
      // ignore
    }
  }

  return (
    <div className="pb-12">
      <CinematicHero imageUrl={user.image} height="sm" alt={user.name ?? ""}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <Avatar className="h-24 w-24 border-4 border-background shadow-glow-sm md:h-28 md:w-28">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-2xl">
              {user.name?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-1">
            <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              {user.name}
            </h1>
            {user.username && (
              <p className="text-muted-foreground">@{user.username}</p>
            )}
            {user.bio && (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {user.bio}
              </p>
            )}
            {!isOwn && <FollowButton userId={userId} className="mt-3" />}
          </div>
        </div>
      </CinematicHero>

      <PageShell variant="standard" className="space-y-8">
        <FadeIn>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "次打卡", value: visitCount },
              { label: "都道府縣", value: prefectureList.length },
              { label: "篇遊記", value: travelogueCount },
              { label: "巡禮作品", value: animeRows.length },
              { label: "貢獻分", value: user.contributionScore },
            ].map((stat) => (
              <StatPill key={stat.label} value={stat.value} label={stat.label} className="px-4 py-3" />
            ))}
          </div>
        </FadeIn>

        {isOwn && (
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">設定</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/bookmarks">收藏</Link>
            </Button>
          </div>
        )}

        <ProfileTabNav userId={userId} activeTab={activeTab} />

        {activeTab === "overview" && (
          <>
            <Link
              href={`/users/${userId}/wrapped/${currentYear}`}
              className="group mt-8 block"
            >
              <Card className="relative overflow-hidden border-primary/20 transition-all duration-300 hover:border-primary/40 hover:shadow-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-900/80 via-primary/20 to-primary/20" />
                <div className="relative flex items-center gap-4 p-6">
                  <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/20 shadow-glow-sm">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-1">
                      年度回顧
                    </Badge>
                    <h2 className="font-display text-lg font-bold group-hover:text-primary">
                      {currentYear} 巡禮回顧
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      查看 {user.name} 的巡禮足跡與成就
                    </p>
                  </div>
                </div>
              </Card>
            </Link>

            {wrapped && (
              <Card className="mt-8 overflow-hidden border-primary/30 bg-gradient-to-br from-brand-900/50 to-primary/15 p-6">
                <h2 className="font-display text-xl font-bold">
                  {wrapped.year} 年度巡禮回顧
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { value: wrapped.visitCount, label: "次打卡" },
                    { value: wrapped.prefectures.length, label: "都道府縣" },
                    { value: wrapped.travelogueCount, label: "篇遊記" },
                    { value: wrapped.photoCount, label: "張照片" },
                  ].map((item) => (
                    <div key={item.label} className="glass rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-primary">{item.value}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <section>
              <SectionHeader title="巡禮版圖" />
              <div className="mt-4">
                <JapanMap visitedPrefectures={prefectureList.map((p) => p.prefecture)} />
              </div>
            </section>

            <section>
              <SectionHeader title="成就徽章" />
              {achievements.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  開始巡禮以獲得成就！
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {achievements.map((a) => {
                    const Icon =
                      ACHIEVEMENT_ICONS[a.id as AchievementId] ?? Trophy;
                    return (
                      <Card
                        key={a.id}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 text-center transition-all",
                          "hover:border-primary/30 hover:shadow-glow-sm"
                        )}
                        title={a.description}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shadow-glow-sm">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-xs font-medium leading-tight">
                          {a.name}
                        </span>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {contributionActivities.length > 0 && (
              <section>
                <SectionHeader title="貢獻紀錄" />
                <div className="mt-4 space-y-2">
                  {contributionActivities.map((activity) => (
                    <Card key={activity.id} className="p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{activity.type}</span>
                        <span className="text-muted-foreground">
                          <FormattedDate date={activity.createdAt} />
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionHeader
                title="最近打卡"
                href={`/users/${userId}?tab=visits`}
                linkLabel="查看全部"
              />
              <div className="mt-4 space-y-3">
                {visitList.map(({ visit, spot }) => (
                  <Link key={visit.id} href={`/spots/${spot.id}`}>
                    <Card className="flex items-center justify-between p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                      <div>
                        <p className="font-medium">{spot.nameZh}</p>
                        <p className="text-sm text-muted-foreground">
                          {spot.prefecture}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        <FormattedDate date={visit.visitedAt} />
                      </span>
                    </Card>
                  </Link>
                ))}
                {visitList.length === 0 && (
                  <EmptyState
                    icon={MapPin}
                    title="尚無打卡紀錄"
                    description="探索聖地並打卡，開始你的巡禮之旅"
                    actionLabel="探索聖地"
                    actionHref="/spots"
                  />
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === "anime" && (
          <div className="mt-8">
            <div className="mb-4 flex flex-wrap gap-2">
              <Link
                href={`/users/${userId}?tab=anime`}
                className={cn(
                  "rounded-full px-3 py-1 text-sm transition-colors",
                  statusFilter === "all"
                    ? "bg-primary/20 text-primary"
                    : "bg-elevated text-muted-foreground hover:text-foreground"
                )}
              >
                全部
              </Link>
              {PILGRIMAGE_STATUSES.map((s) => (
                <Link
                  key={s}
                  href={`/users/${userId}?tab=anime&status=${s}`}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm transition-colors",
                    statusFilter === s
                      ? "bg-primary/20 text-primary"
                      : "bg-elevated text-muted-foreground hover:text-foreground"
                  )}
                >
                  {PILGRIMAGE_STATUS_LABELS[s]}
                </Link>
              ))}
            </div>
            <AnimeListTable
              rows={animeRows.map((r) => ({
                anilistId: r.anime.anilistId,
                titles: r.anime.titles,
                coverImage: r.anime.coverImage,
                status: r.status.status,
                score: r.status.score,
                visitedSpotCount: r.status.visitedSpotCount,
                spotCount: r.spotCount ?? 0,
              }))}
              statusFilter={statusFilter}
            />
          </div>
        )}

        {activeTab === "visits" && (
          <div className="mt-8 space-y-3">
            {visitList.map(({ visit, spot }) => (
              <Link key={visit.id} href={`/spots/${spot.id}`}>
                <Card className="flex items-center justify-between p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                  <div>
                    <p className="font-medium">{spot.nameZh}</p>
                    <p className="text-sm text-muted-foreground">
                      {spot.prefecture}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <FormattedDate date={visit.visitedAt} />
                  </span>
                </Card>
              </Link>
            ))}
            {visitList.length === 0 && (
              <EmptyState
                icon={MapPin}
                title="尚無打卡紀錄"
                description="探索聖地並打卡，開始你的巡禮之旅"
                actionLabel="探索聖地"
                actionHref="/spots"
              />
            )}
          </div>
        )}

        {activeTab === "travelogues" && (
          <div className="mt-8 space-y-3">
            {userTravelogues.map((t) => (
              <Link key={t.id} href={`/travelogue/${t.slug}`}>
                <Card className="p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{t.title}</p>
                    {!t.isPublished && isOwn && (
                      <Badge variant="secondary">草稿</Badge>
                    )}
                  </div>
                  {t.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.excerpt}
                    </p>
                  )}
                  {t.publishedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <FormattedDate date={t.publishedAt} />
                    </p>
                  )}
                </Card>
              </Link>
            ))}
            {userTravelogues.length === 0 && (
              <EmptyState
                icon={BookOpen}
                title="尚無遊記"
                description={
                  isOwn ? "分享你的巡禮故事" : "這位巡禮者尚未發布遊記"
                }
                actionLabel={isOwn ? "撰寫遊記" : undefined}
                actionHref={isOwn ? "/travelogue/new" : undefined}
              />
            )}
          </div>
        )}

        {activeTab === "lists" && (
          <div className="mt-8 space-y-3">
            {userLists.map((list) => (
              <Link key={list.id} href={`/lists/${list.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <List className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{list.title}</p>
                    {list.description && (
                      <p className="truncate text-sm text-muted-foreground">
                        {list.description}
                      </p>
                    )}
                  </div>
                  {!list.isPublic && isOwn && (
                    <Badge variant="secondary">私人</Badge>
                  )}
                </Card>
              </Link>
            ))}
            {userLists.length === 0 && (
              <EmptyState
                icon={List}
                title="尚無清單"
                description={isOwn ? "建立清單整理想去的聖地" : "這位巡禮者尚未建立清單"}
                actionLabel={isOwn ? "建立清單" : undefined}
                actionHref={isOwn ? "/lists/new" : undefined}
              />
            )}
            {isOwn && userLists.length > 0 && (
              <div className="pt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/lists/new">建立清單</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </PageShell>
    </div>
  );
}
