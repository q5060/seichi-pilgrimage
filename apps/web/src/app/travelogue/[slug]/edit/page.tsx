import dynamic from "next/dynamic";
import { db, travelogues } from "@seichi/db";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { TravelogueBlock } from "@/components/travelogue/editor";
import { auth } from "@/lib/auth";
import { canEditTravelogue } from "@/lib/collaboration";
import { Skeleton } from "@/components/ui/skeleton";

const TravelogueEditor = dynamic(
  () =>
    import("@/components/travelogue/editor").then((m) => m.TravelogueEditor),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-10 w-32" />
      </div>
    ),
  }
);

export default async function EditTraveloguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const [t] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.slug, slug))
    .limit(1);

  if (!t) notFound();

  if (!session?.user?.id || !(await canEditTravelogue(t.id, session.user.id))) {
    redirect(`/travelogue/${slug}`);
  }

  const isOwner = t.userId === session.user.id;

  return (
    <TravelogueEditor
      initialSlug={slug}
      initialTitle={t.title}
      initialExcerpt={t.excerpt ?? ""}
      initialSeriesName={t.seriesName ?? ""}
      initialSeriesOrder={t.seriesOrder ?? ""}
      initialBlocks={(t.content ?? []) as TravelogueBlock[]}
      isOwner={isOwner}
    />
  );
}
