import { getSpotPhotos } from "@/lib/spot-page";
import { PhotoGallery } from "@/components/spots/photo-gallery";

export async function SpotPhotoSection({ spotId }: { spotId: string }) {
  const photos = await getSpotPhotos(spotId);
  return <PhotoGallery spotId={spotId} initialPhotos={photos} />;
}
