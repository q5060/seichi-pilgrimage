import { db, travelogues } from "@seichi/db";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { TravelogueBlock } from "@/components/travelogue/editor";
import { auth } from "@/lib/auth";
import { canEditTravelogue } from "@/lib/collaboration";
import { TravelogueEditorLoader } from "@/components/travelogue/travelogue-editor-loader";

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
    <TravelogueEditorLoader
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
