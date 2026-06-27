"use client";

import { LikeButton } from "@/components/social/LikeButton";
import { BookmarkButton } from "@/components/social/BookmarkButton";
import { SpotHelpfulButton } from "@/components/social/SpotHelpfulButton";
import type { ReactionTarget } from "@seichi/shared";

import type { SocialReactionState } from "@/lib/social-status";

interface ContentSocialBarProps {
  targetType: ReactionTarget;
  targetId: string;
  link?: string;
  showHelpful?: boolean;
  spotId?: string;
  initialState?: SocialReactionState;
}

export function ContentSocialBar({
  targetType,
  targetId,
  link,
  showHelpful,
  spotId,
  initialState,
}: ContentSocialBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LikeButton
        targetType={targetType}
        targetId={targetId}
        link={link}
        initialLikeCount={initialState?.likeCount}
        initialLiked={initialState?.liked}
      />
      <BookmarkButton
        targetType={targetType}
        targetId={targetId}
        initialBookmarked={initialState?.bookmarked}
      />
      {showHelpful && spotId && (
        <SpotHelpfulButton
          spotId={spotId}
          initialCount={initialState?.helpfulCount}
          initialVoted={initialState?.helpfulVoted}
        />
      )}
    </div>
  );
}
