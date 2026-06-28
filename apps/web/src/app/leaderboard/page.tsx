import { getLeaderboard } from "@/lib/leaderboard";
import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";

export const revalidate = 60;

export default async function LeaderboardPage() {
  const items = await getLeaderboard("contribution");
  return <LeaderboardClient initialType="contribution" initialItems={items} />;
}
