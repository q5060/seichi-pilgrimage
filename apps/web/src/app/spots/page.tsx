import { fetchSpotsListPage } from "@/lib/spots-list";
import { SpotsExploreClient } from "@/components/spots/spots-explore-client";

export const revalidate = 60;

export default async function SpotsExplorePage() {
  const { items, nextCursor } = await fetchSpotsListPage(null, 0);

  return (
    <SpotsExploreClient
      initialSpots={items}
      initialNextCursor={nextCursor}
      initialPrefecture="all"
    />
  );
}
