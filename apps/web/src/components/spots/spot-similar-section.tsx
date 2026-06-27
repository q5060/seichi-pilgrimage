import { cacheFetch } from "@/lib/cache";
import { getSimilarSpots } from "@/lib/discovery-similar";
import { SectionHeader } from "@/components/ui/section-header";
import { SpotCard } from "@/components/spots/spot-card";

export async function SpotSimilarSection({ spotId }: { spotId: string }) {
  const similarSpots = await cacheFetch(
    `spot-similar:${spotId}`,
    () => getSimilarSpots(spotId),
    60 * 1000
  );

  if (similarSpots.length === 0) return null;

  return (
    <section>
      <SectionHeader title="相關聖地" />
      <div className="grid gap-4 sm:grid-cols-2">
        {similarSpots.map((s) => (
          <SpotCard
            key={s.id}
            spot={{
              id: s.id,
              nameZh: s.nameZh,
              nameJa: s.nameJa,
              prefecture: s.prefecture,
              coverPhotoUrl: s.thumbnailUrl ?? null,
            }}
          />
        ))}
      </div>
    </section>
  );
}
