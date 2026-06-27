import { TravelogueListClient } from "@/components/travelogue/travelogue-list-client";

export const revalidate = 60;

export default function TravelogueListPage() {
  return <TravelogueListClient />;
}
