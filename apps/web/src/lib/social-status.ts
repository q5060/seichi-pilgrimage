import { db, likes, bookmarks, spots, spotHelpfulVotes } from "@seichi/db";
import { and, eq, count, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { ReactionTarget } from "@seichi/shared";

export interface SocialReactionState {
  likeCount: number;
  liked: boolean;
  bookmarked: boolean;
  helpfulCount?: number;
  helpfulVoted?: boolean;
}

export async function getSocialReactionState(
  targetType: ReactionTarget,
  targetId: string,
  options?: { includeHelpful?: boolean; spotId?: string }
): Promise<SocialReactionState> {
  const session = await auth();

  const [likeResult] = await db
    .select({ count: count() })
    .from(likes)
    .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

  let liked = false;
  let bookmarked = false;

  if (session?.user?.id) {
    const [likeRow, bookmarkRow] = await Promise.all([
      db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, session.user.id),
            eq(likes.targetType, targetType),
            eq(likes.targetId, targetId)
          )
        )
        .limit(1),
      db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, session.user.id),
            eq(bookmarks.targetType, targetType),
            eq(bookmarks.targetId, targetId)
          )
        )
        .limit(1),
    ]);
    liked = !!likeRow;
    bookmarked = !!bookmarkRow;
  }

  const state: SocialReactionState = {
    likeCount: likeResult?.count ?? 0,
    liked,
    bookmarked,
  };

  if (options?.includeHelpful && options.spotId) {
    const spotId = options.spotId;
    const [spot] = await db.select().from(spots).where(eq(spots.id, spotId)).limit(1);
    let helpfulVoted = false;
    if (session?.user?.id) {
      const [vote] = await db
        .select()
        .from(spotHelpfulVotes)
        .where(
          and(eq(spotHelpfulVotes.spotId, spotId), eq(spotHelpfulVotes.userId, session.user.id))
        )
        .limit(1);
      helpfulVoted = !!vote;
    }
    state.helpfulCount = spot?.helpfulCount ?? 0;
    state.helpfulVoted = helpfulVoted;
  }

  return state;
}

export type SocialBatchTarget = {
  targetType: ReactionTarget;
  targetId: string;
  includeHelpful?: boolean;
  spotId?: string;
};

function batchKey(target: SocialBatchTarget) {
  return `${target.targetType}:${target.targetId}`;
}

export async function getSocialBatchStatus(
  targets: SocialBatchTarget[]
): Promise<Record<string, SocialReactionState>> {
  if (targets.length === 0) return {};

  const session = await auth();
  const unique = new Map<string, SocialBatchTarget>();
  for (const t of targets) {
    unique.set(batchKey(t), t);
  }
  const list = [...unique.values()];

  const likeCounts = await db
    .select({
      targetType: likes.targetType,
      targetId: likes.targetId,
      count: count(),
    })
    .from(likes)
    .where(
      inArray(
        likes.targetId,
        list.map((t) => t.targetId)
      )
    )
    .groupBy(likes.targetType, likes.targetId);

  const countMap = new Map(
    likeCounts.map((r) => [`${r.targetType}:${r.targetId}`, r.count])
  );

  let userLikes: { targetType: string; targetId: string }[] = [];
  let userBookmarks: { targetType: string; targetId: string }[] = [];
  let userHelpfulVotes: { spotId: string }[] = [];

  if (session?.user?.id) {
    const targetIds = list.map((t) => t.targetId);
    [userLikes, userBookmarks] = await Promise.all([
      db
        .select({ targetType: likes.targetType, targetId: likes.targetId })
        .from(likes)
        .where(
          and(eq(likes.userId, session.user.id), inArray(likes.targetId, targetIds))
        ),
      db
        .select({ targetType: bookmarks.targetType, targetId: bookmarks.targetId })
        .from(bookmarks)
        .where(
          and(eq(bookmarks.userId, session.user.id), inArray(bookmarks.targetId, targetIds))
        ),
    ]);

    const helpfulSpotIds = list
      .filter((t) => t.includeHelpful && t.spotId)
      .map((t) => t.spotId!);
    if (helpfulSpotIds.length > 0) {
      userHelpfulVotes = await db
        .select({ spotId: spotHelpfulVotes.spotId })
        .from(spotHelpfulVotes)
        .where(
          and(
            eq(spotHelpfulVotes.userId, session.user.id),
            inArray(spotHelpfulVotes.spotId, helpfulSpotIds)
          )
        );
    }
  }

  const likedSet = new Set(userLikes.map((r) => `${r.targetType}:${r.targetId}`));
  const bookmarkedSet = new Set(
    userBookmarks.map((r) => `${r.targetType}:${r.targetId}`)
  );
  const helpfulVotedSet = new Set(userHelpfulVotes.map((r) => r.spotId));

  const helpfulSpotIds = list
    .filter((t) => t.includeHelpful && t.spotId)
    .map((t) => t.spotId!);
  const spotRows =
    helpfulSpotIds.length > 0
      ? await db
          .select({ id: spots.id, helpfulCount: spots.helpfulCount })
          .from(spots)
          .where(inArray(spots.id, helpfulSpotIds))
      : [];
  const helpfulCountMap = new Map(spotRows.map((s) => [s.id, s.helpfulCount]));

  const result: Record<string, SocialReactionState> = {};
  for (const target of list) {
    const key = batchKey(target);
    const state: SocialReactionState = {
      likeCount: countMap.get(key) ?? 0,
      liked: likedSet.has(key),
      bookmarked: bookmarkedSet.has(key),
    };
    if (target.includeHelpful && target.spotId) {
      state.helpfulCount = helpfulCountMap.get(target.spotId) ?? 0;
      state.helpfulVoted = helpfulVotedSet.has(target.spotId);
    }
    result[key] = state;
  }

  return result;
}
