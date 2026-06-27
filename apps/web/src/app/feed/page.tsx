import { getFeedItems } from "@/lib/feed";
import { FeedClient } from "@/components/feed/feed-client";

export const revalidate = 60;

export default async function FeedPage() {
  const { items, nextCursor } = await getFeedItems({ limit: 20 });
  return <FeedClient initialItems={items} initialNextCursor={nextCursor} />;
}
