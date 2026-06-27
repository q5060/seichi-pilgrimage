import Link from "next/link";
import { db, travelogues } from "@seichi/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { canEditTravelogue } from "@/lib/collaboration";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export async function TravelogueEditLink({ slug }: { slug: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [t] = await db
    .select()
    .from(travelogues)
    .where(eq(travelogues.slug, slug))
    .limit(1);

  if (!t || !(await canEditTravelogue(t.id, session.user.id))) return null;

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/travelogue/${slug}/edit`}>
        <Pencil className="mr-1.5 h-3.5 w-3.5" />
        編輯遊記
      </Link>
    </Button>
  );
}
