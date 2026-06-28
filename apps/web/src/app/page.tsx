import Link from "next/link";
import { getAnimeDisplayTitleForRequest } from "@/lib/display-names-server";
import {
  getSeasonalPicks,
  getWeeklyPopular,
  currentSeasonLabel,
} from "@/lib/discovery";
import { getHomePageSnapshot, type HomePageSnapshot } from "@/lib/home-data";
import { HomeDeferredSections } from "@/components/home/home-deferred-sections";
import { HomeDataUnavailableBanner } from "@/components/home/home-data-unavailable-banner";
import { CinematicHero } from "@/components/ui/cinematic-hero";
import { PosterCard } from "@/components/ui/poster-card";
import { SectionHeader } from "@/components/ui/section-header";
import { StatPill } from "@/components/ui/stat-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Compass, Sparkles } from "lucide-react";

export const revalidate = 60;

function PosterRow({ children }: { children: React.ReactNode }) {
  return <div className="snap-scroll -mx-4 px-4">{children}</div>;
}

export default async function HomePage() {
  let popularAnime: HomePageSnapshot["popularAnime"] = [];
  let recentTravelogues: HomePageSnapshot["recentTravelogues"] = [];
  let stats: HomePageSnapshot["stats"] = [{ spotCount: 0, visitCount: 0 }];
  let seasonalPicks: Awaited<ReturnType<typeof getSeasonalPicks>> = [];
  let weeklyPopular: Awaited<ReturnType<typeof getWeeklyPopular>> = [];
  let dataUnavailable = false;

  try {
    const snapshotPromise = getHomePageSnapshot();
    const discoveryPromise = Promise.all([
      getSeasonalPicks(),
      getWeeklyPopular(),
    ]);

    const [discovery, snapshot] = await Promise.all([
      discoveryPromise,
      snapshotPromise,
    ]);

    [seasonalPicks, weeklyPopular] = discovery;
    stats = snapshot.stats;
    popularAnime = snapshot.popularAnime;
    recentTravelogues = snapshot.recentTravelogues;
  } catch {
    dataUnavailable = true;
  }

  const season = currentSeasonLabel();
  const heroAnime = popularAnime.find((a) => a.anime.coverImage);
  const heroImage = heroAnime?.anime.coverImage ?? null;
  const heroTitle = heroAnime
    ? await getAnimeDisplayTitleForRequest(heroAnime.anime.titles as { chinese?: string; native?: string; romaji?: string; english?: string })
    : "動畫聖地巡禮";

  const popularAnimeTitles = await Promise.all(
    popularAnime.map(({ anime: a }) =>
      getAnimeDisplayTitleForRequest(a.titles as { chinese?: string; native?: string; romaji?: string; english?: string })
    )
  );

  return (
    <div className="bg-background text-foreground">
      {dataUnavailable && <HomeDataUnavailableBanner />}
      <CinematicHero imageUrl={heroImage} alt={heroTitle} height="lg">
        <FadeIn>
          <h1 className="font-display text-display max-w-2xl">動畫聖地巡禮社群</h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            追蹤去過的聖地、探索動畫取景地、分享完整遊記。像 AniList
            一樣管理你的巡禮進度。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/spots">
                <Compass className="h-4 w-4" />
                探索聖地
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/spots/new">新增聖地</Link>
            </Button>
            <Button asChild variant="glass" size="lg">
              <Link href="/search">搜尋作品</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <StatPill value={stats[0]?.spotCount ?? 0} label="聖地" />
            <StatPill value={stats[0]?.visitCount ?? 0} label="次打卡" />
          </div>
        </FadeIn>
      </CinematicHero>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        <FadeIn delay={0.1}>
          <SectionHeader
            title={`${season}季精選聖地`}
            description="依最佳季節推薦的巡禮地點"
            href="/spots"
            linkLabel="查看全部"
          />
          {seasonalPicks.length > 0 ? (
            <StaggerChildren>
              <PosterRow>
                {seasonalPicks.map((spot) => (
                  <StaggerItem key={spot.id}>
                    <PosterCard
                      href={`/spots/${spot.id}`}
                      title={spot.nameZh}
                      subtitle={spot.prefecture}
                      badge={spot.bestSeason ?? undefined}
                    />
                  </StaggerItem>
                ))}
              </PosterRow>
            </StaggerChildren>
          ) : (
            <EmptyState
              icon={MapPin}
              title="尚無季節精選"
              description="目前沒有符合本季推薦的聖地，歡迎新增第一個！"
              actionLabel="新增聖地"
              actionHref="/spots/new"
            />
          )}
        </FadeIn>

        <FadeIn delay={0.15}>
          <SectionHeader
            title="本週熱門"
            description="近 7 日打卡最多的聖地"
            href="/spots"
            linkLabel="查看全部"
          />
          {weeklyPopular.length > 0 ? (
            <StaggerChildren>
              <PosterRow>
                {weeklyPopular.map((spot) => (
                  <StaggerItem key={spot.id}>
                    <PosterCard
                      href={`/spots/${spot.id}`}
                      title={spot.nameZh}
                      subtitle={spot.prefecture}
                      badge={
                        "weeklyVisits" in spot && spot.weeklyVisits > 0
                          ? `${spot.weeklyVisits} 次`
                          : undefined
                      }
                    />
                  </StaggerItem>
                ))}
              </PosterRow>
            </StaggerChildren>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="本週尚無打卡"
              description="成為第一個在本週打卡的巡禮者！"
              actionLabel="探索聖地"
              actionHref="/spots"
            />
          )}
        </FadeIn>

        <HomeDeferredSections />

        <FadeIn delay={0.25}>
          <SectionHeader title="熱門巡禮作品" href="/anime" linkLabel="瀏覽全部" />
          {popularAnime.length > 0 ? (
            <StaggerChildren>
              <PosterRow>
                {popularAnime.map(({ anime: a, spotCount }, i) => (
                  <StaggerItem key={a.anilistId}>
                    <PosterCard
                      href={`/anime/${a.anilistId}`}
                      title={popularAnimeTitles[i]}
                      subtitle={`${spotCount} 個聖地`}
                      imageUrl={a.coverImage}
                    />
                  </StaggerItem>
                ))}
              </PosterRow>
            </StaggerChildren>
          ) : (
            <EmptyState
              title="尚無作品資料"
              description="作品資料同步中，請稍後再試。"
              actionLabel="搜尋作品"
              actionHref="/search"
            />
          )}
        </FadeIn>

        {recentTravelogues.length > 0 && (
          <FadeIn delay={0.35}>
            <SectionHeader title="最新遊記" href="/travelogue" linkLabel="全部遊記" />
            <StaggerChildren className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentTravelogues.map((t) => (
                <StaggerItem key={t.id}>
                  <Link href={`/travelogue/${t.slug}`}>
                    <Card className="h-full transition-all duration-300 hover:border-primary/30 hover:shadow-glow-sm">
                      <CardContent className="p-5">
                        <h3 className="font-display font-semibold leading-tight">
                          {t.title}
                        </h3>
                        {t.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {t.excerpt}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerChildren>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
