"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Collaborator {
  userId: string;
  role?: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface CollaboratorsPanelProps {
  apiPath: string;
  title?: string;
  isOwner: boolean;
}

export function CollaboratorsPanel({
  apiPath,
  title = "協作者",
  isOwner,
}: CollaboratorsPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(apiPath);
    if (res.ok) {
      const data = await res.json();
      setCollaborators(data.collaborators ?? []);
    }
    setLoading(false);
  }, [apiPath]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setSaving(true);
    setError("");

    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "邀請失敗");
      return;
    }

    setUsername("");
    await load();
  }

  async function remove(userId: string) {
    const res = await fetch(apiPath, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) await load();
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {collaborators.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚無協作者</p>
        ) : (
          <ul className="space-y-2">
            {collaborators.map((c) => (
              <li key={c.userId} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.user.image ?? undefined} />
                  <AvatarFallback>
                    {(c.user.name ?? c.user.username ?? "?")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.user.name ?? c.user.username}
                  </p>
                  {c.user.username && (
                    <p className="text-xs text-muted-foreground">@{c.user.username}</p>
                  )}
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => remove(c.userId)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="移除協作者"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <form onSubmit={invite} className="flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@使用者名稱"
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={saving}>
              邀請
            </Button>
          </form>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
