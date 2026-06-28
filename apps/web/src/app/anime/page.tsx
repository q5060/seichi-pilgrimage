import { getTranslations } from "next-intl/server";
import { Film } from "lucide-react";
import { PosterCard } from "@/components/ui/poster-card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { FadeIn, StaggerChildren, StaggerItem } from "@/components/ui/motion";
import { AnimeBrowseFilters } from "@/components/anime/anime-browse-filters";
import { getAnimeDisplayTitleForRequest } from "@/lib/display-names-server";
import {
  getBrowseAnime,
  parseBrowseTab,
  parseSeason,
  parseYear,
} from "@/lib/anime-browse";

export const revalidate = 3600;

export default async function AnimeBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    season?: string;
    year?: string;
    genre?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = parseBrowseTab(params.tab);
  const season = parseSeason(params.season);
  const year = parseYear(params.year);
  const genre = params.genre?.trim() || undefined;

  const t = await getTranslations("animeBrowse");

  let items: Awaited<ReturnType<typeof getBrowseAnime>> = [];
  let loadError = false;

  try {
    items = await getBrowseAnime({ tab, season, year, genre });
  } catch {
    loadError = true;
  }

  const titles = await Promise.all(
    items.map((item) => getAnimeDisplayTitleForRequest(item.titles))
  );

  return (
    <PageShell>
      <PageHeader
        title={t("title")}
        description={t("description")}
      />
      <FadeIn>
        <AnimeBrowseFilters tab={tab} season={season} year={year} genre={genre} />
      </FadeIn>

      <div className="mt-8">
        {loadError ? (
          <EmptyState
            icon={Film}
            title={t("loadFailed")}
            description={t("loadFailedHint")}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Film}
            title={t("empty")}
            description={t("emptyHint")}
          />
        ) : (
          <StaggerChildren className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item, i) => (
              <StaggerItem key={item.anilistId}>
                <PosterCard
                  href={`/anime/${item.anilistId}`}
                  title={titles[i]}
                  subtitle={
                    item.averageScore
                      ? `AniList ${item.averageScore}`
                      : undefined
                  }
                  imageUrl={item.coverImage}
                  badge={item.spotCount > 0 ? `${item.spotCount} 聖地` : undefined}
                  className="w-full"
                />
              </StaggerItem>
            ))}
          </StaggerChildren>
        )}
      </div>
    </PageShell>
  );
}
