import { getPublishedTravelogue } from "@/lib/travelogue-data";
import { notFound } from "next/navigation";
import { db, travelogues } from "@seichi/db";
import { eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { formatDate } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { getTravelogueCoverUrl } from "@/lib/thumbnails";
import type { TravelogueBlock } from "@seichi/db";
import { TravelogueEditLink } from "@/components/travelogue/edit-link";
import { ContentSocialBar } from "@/components/social/content-social-bar";
import { LazyCommentThread } from "@/components/social/lazy-comment-thread";
import { CinematicHero } from "@/components/ui/cinematic-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const revalidate = 60;

function getHeroImage(
  blocks: TravelogueBlock[],
  coverImageUrl?: string | null
): string | null {
  for (const block of blocks) {
    const data = block.data as Record<string, unknown>;
    if (block.type === "photo_gallery") {
      const urls = (data.urls as string[]) ?? [];
      if (urls[0]) return urls[0];
    }
    if (block.type === "comparison" && data.photoUrl) {
      return data.photoUrl as string;
    }
  }
  return coverImageUrl ?? null;
}

export default async function TraveloguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let result = await getPublishedTravelogue(slug);
  if (!result) {
    const { db, travelogues, users } = await import("@seichi/db");
    const { eq } = await import("drizzle-orm");
    const [row] = await db
      .select({ travelogue: travelogues, author: users })
      .from(travelogues)
      .innerJoin(users, eq(travelogues.userId, users.id))
      .where(eq(travelogues.slug, slug))
      .limit(1);
    if (!row) notFound();
    result = row;
  }

  const { travelogue: t, author } = result;
  const blocks = (t.content ?? []) as TravelogueBlock[];
  const heroImage = getHeroImage(blocks, t.coverImageUrl);

  return (
    <article>
      <CinematicHero imageUrl={heroImage} alt={t.title} height="lg">
        <div className="mx-auto w-full max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            遊記
          </Badge>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            {t.title}
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <Avatar className="h-8 w-8 border-white/20">
              <AvatarImage src={author.image ?? undefined} />
              <AvatarFallback>{author.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">{author.name}</span>
              {t.publishedAt && <> · {formatDate(t.publishedAt)}</>}
            </p>
          </div>
          {t.excerpt && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {t.excerpt}
            </p>
          )}
        </div>
      </CinematicHero>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <ContentSocialBar
            targetType="travelogue"
            targetId={t.id}
            link={`/travelogue/${slug}`}
          />
          <TravelogueEditLink slug={slug} />
        </div>

        <div
          className={cn(
            "space-y-6 text-base leading-[1.85] text-foreground/90",
            "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-foreground",
            "[&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground",
            "[&_p]:text-muted-foreground [&_p]:leading-[1.85]",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-foreground/80",
            "[&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline",
            "[&_strong]:font-semibold [&_strong]:text-foreground",
            "[&_figure]:my-8",
            "[&_figcaption]:mt-2 [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground"
          )}
        >
          {blocks.map((block) => {
            const data = block.data as Record<string, unknown>;

            switch (block.type) {
              case "heading":
                return (
                  <h2 key={block.id} className="pt-4">
                    {data.text as string}
                  </h2>
                );
              case "paragraph":
                if (data.html) {
                  return (
                    <div
                      key={block.id}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(data.html as string),
                      }}
                    />
                  );
                }
                return (
                  <p key={block.id} className="text-muted-foreground">
                    {data.text as string}
                  </p>
                );
              case "quote":
                return (
                  <blockquote key={block.id}>
                    {data.text as string}
                  </blockquote>
                );
              case "spot_card":
                return (
                  <Card key={block.id} className="my-6 p-4">
                    {data.spotId ? (
                      <Link
                        href={`/spots/${data.spotId}`}
                        className="group block hover:text-primary"
                      >
                        <p className="font-medium group-hover:text-primary">
                          {data.name as string}
                        </p>
                        {(data.prefecture as string) && (
                          <p className="text-sm text-muted-foreground">
                            {data.prefecture as string}
                          </p>
                        )}
                      </Link>
                    ) : (
                      <p className="font-medium">聖地：{data.name as string}</p>
                    )}
                  </Card>
                );
              case "route_segment":
                return (
                  <Card
                    key={block.id}
                    className="my-6 flex items-center gap-3 p-4 text-sm"
                  >
                    <MapPin className="h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        {data.from as string} → {data.to as string}
                      </p>
                      <p className="text-muted-foreground">
                        {data.transport as string}
                        {Boolean(data.minutes) && ` · 約 ${data.minutes} 分鐘`}
                      </p>
                    </div>
                  </Card>
                );
              case "photo_gallery": {
                const urls = (data.urls as string[]) ?? [];
                return (
                  <figure key={block.id}>
                    <div className="grid grid-cols-2 gap-3">
                      {urls.map((url, i) => (
                        <div
                          key={i}
                          className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
                        >
                          <Image
                            src={url}
                            alt={(data.caption as string) ?? ""}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 384px"
                          />
                        </div>
                      ))}
                    </div>
                    {Boolean(data.caption) && (
                      <figcaption>{data.caption as string}</figcaption>
                    )}
                  </figure>
                );
              }
              case "comparison":
                return (
                  <figure key={block.id}>
                    <div className="grid grid-cols-2 gap-3">
                      {Boolean(data.photoUrl) && (
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">實拍</p>
                          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
                            <Image
                              src={data.photoUrl as string}
                              alt="實拍"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 384px"
                            />
                          </div>
                        </div>
                      )}
                      {Boolean(data.screenshotUrl) && (
                        <div>
                          <p className="mb-2 text-xs text-muted-foreground">動畫</p>
                          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
                            <Image
                              src={data.screenshotUrl as string}
                              alt="動畫截圖"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 384px"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    {Boolean(data.caption) && (
                      <figcaption>{data.caption as string}</figcaption>
                    )}
                  </figure>
                );
              case "map_embed":
                return (
                  <a
                    key={block.id}
                    href={data.url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Card className="my-6 flex items-center gap-3 p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                      <ExternalLink className="h-5 w-5 text-primary" />
                      <span className="font-medium">
                        {(data.label as string) || "在 Google 地圖開啟"}
                      </span>
                    </Card>
                  </a>
                );
              case "expense":
                return (
                  <Card key={block.id} className="my-6 p-4 text-sm">
                    <span className="font-medium text-foreground">
                      {data.category as string}
                    </span>
                    <span className="ml-2 text-primary">
                      ¥{data.amount as string}
                    </span>
                    {Boolean(data.note) && (
                      <p className="mt-1 text-muted-foreground">
                        {data.note as string}
                      </p>
                    )}
                  </Card>
                );
              default:
                return null;
            }
          })}
        </div>

        <section className="mt-12 border-t border-border pt-8">
          <LazyCommentThread
            targetType="travelogue"
            targetId={t.id}
            link={`/travelogue/${slug}`}
          />
        </section>
      </div>
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [t] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.slug, slug))
    .limit(1);

  if (!t) {
    return { title: "遊記" };
  }

  const coverUrl = getTravelogueCoverUrl(t.content as TravelogueBlock[]);
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const absoluteCover =
    coverUrl && !coverUrl.startsWith("http")
      ? `${baseUrl}${coverUrl.startsWith("/") ? coverUrl : `/${coverUrl}`}`
      : coverUrl;

  return {
    title: `${t.title} — 聖地巡禮`,
    description: t.excerpt ?? undefined,
    ...(absoluteCover
      ? {
          openGraph: {
            title: t.title,
            description: t.excerpt ?? undefined,
            images: [{ url: absoluteCover }],
          },
          twitter: {
            card: "summary_large_image",
            images: [absoluteCover],
          },
        }
      : {}),
  };
}
