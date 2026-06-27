"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ReactionTarget } from "@seichi/shared";

interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommentReply {
  id: string;
  body: string;
  createdAt: string;
  user: CommentUser;
}

interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  user: CommentUser;
  replies: CommentReply[];
}

interface CommentThreadProps {
  targetType: ReactionTarget;
  targetId: string;
  link?: string;
}

export function CommentThread({ targetType, targetId, link }: CommentThreadProps) {
  const { requireAuth } = useRequireAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function loadComments() {
    fetch(
      `/api/social?type=comments&targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
    )
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth() || !body.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "comment",
        targetType,
        targetId,
        parentId: replyTo,
        body: body.trim(),
        link,
      }),
    });
    if (res.ok) {
      setBody("");
      setReplyTo(null);
      loadComments();
      toast.success("留言已送出");
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "留言失敗，請稍後再試");
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 font-display font-bold">
        <MessageCircle className="h-5 w-5 text-primary" />
        討論 ({comments.length})
      </h3>

      <form onSubmit={submit} className="space-y-2">
        {replyTo && (
          <p className="text-sm text-muted-foreground">
            回覆留言中…
            <Button
              type="button"
              variant="link"
              size="sm"
              className="ml-2 h-auto p-0"
              onClick={() => setReplyTo(null)}
            >
              取消
            </Button>
          </p>
        )}
        <div className="flex gap-2">
          <Input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="留下你的想法…"
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={submitting || !body.trim()}
            aria-label="送出留言"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">載入留言中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">尚無留言，成為第一個發聲的人吧！</p>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="space-y-2">
              <Card className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.user.image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">
                      {c.user.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.user.name ?? "匿名"}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">{c.body}</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0 text-xs"
                      onClick={() => {
                        if (requireAuth()) setReplyTo(c.id);
                      }}
                    >
                      回覆
                    </Button>
                  </div>
                </div>
              </Card>
              {c.replies.length > 0 && (
                <div className="ml-8 space-y-2 border-l-2 border-border pl-4">
                  {c.replies.map((r) => (
                    <Card key={r.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={r.user.image ?? undefined} alt="" />
                          <AvatarFallback className="text-xs">
                            {r.user.name?.[0] ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">{r.user.name ?? "匿名"}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(r.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-foreground/90">{r.body}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
