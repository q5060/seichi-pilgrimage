"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactionTarget } from "@seichi/shared";

const CommentThread = dynamic(
  () =>
    import("@/components/social/CommentThread").then((m) => ({
      default: m.CommentThread,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    ),
  }
);

interface LazyCommentThreadProps {
  targetType: ReactionTarget;
  targetId: string;
  link?: string;
}

export function LazyCommentThread({ targetType, targetId, link }: LazyCommentThreadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-[120px]">
      {visible ? (
        <CommentThread targetType={targetType} targetId={targetId} link={link} />
      ) : (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
