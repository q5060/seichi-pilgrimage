import { getUserBookmarks } from "@/lib/bookmarks-list";
import { BookmarksClient } from "@/components/bookmarks/bookmarks-client";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const items = await getUserBookmarks();
  return <BookmarksClient initialItems={items} />;
}
