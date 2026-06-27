import { db, spots, spotAnimeLinks } from "@seichi/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getAnimeDisplayTitleForRequest } from "@/lib/display-names-server";
import { getOrSyncAnime } from "@/lib/anime-sync";
import { CommentThread } from "@/components/social/CommentThread";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AnimeDiscussPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anilistId = Number(id);

  const animeData = await getOrSyncAnime(anilistId);
  if (!animeData) notFound();

  const title = await getAnimeDisplayTitleForRequest(animeData.titles);

  const spotLinks = await db
    .select({ spot: spots, link: spotAnimeLinks })
    .from(spotAnimeLinks)
    .innerJoin(spots, eq(spotAnimeLinks.spotId, spots.id))
    .where(eq(spotAnimeLinks.anilistId, anilistId));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={title}
        description="作品討論板"
        breadcrumbs={[
          { label: "作品", href: `/anime/${anilistId}` },
          { label: "討論" },
        ]}
      />

      {animeData.coverImage && (
        <div className="relative -mt-4 mb-8 h-32 overflow-hidden rounded-xl border border-border">
          <Image
            src={animeData.coverImage}
            alt=""
            fill
            className="object-cover opacity-60"
            sizes="768px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <section>
        <CommentThread
          targetType="anime"
          targetId={String(anilistId)}
          link={`/anime/${anilistId}/discuss`}
        />
      </section>

      {spotLinks.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold">
            相關聖地{" "}
            <Badge variant="secondary" className="ml-1">
              {spotLinks.length}
            </Badge>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {spotLinks.map(({ spot }) => (
              <Link key={spot.id} href={`/spots/${spot.id}`}>
                <Card className="p-3 text-sm transition-all hover:border-primary/30 hover:shadow-glow-sm">
                  <p className="font-medium">{spot.nameZh}</p>
                  <p className="text-muted-foreground">{spot.prefecture}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
