import dynamic from "next/dynamic";
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

export default function NewTraveloguePage() {
  return <TravelogueEditor />;
}
