"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useAnimeDisplayTitle } from "@/hooks/use-anime-display-title";
import type { AnimeTitles } from "@seichi/shared";

interface AnimeLink {
  id: string;
  episode?: string | null;
  scene?: { description?: string; timestamp?: string } | null;
  anime: { anilistId: number; titles: AnimeTitles };
}

function AnimeLinkTitle({ titles }: { titles: AnimeTitles }) {
  const title = useAnimeDisplayTitle(titles);
  return <p className="font-medium">{title}</p>;
}

export function SpotAnimeLinksEditor({
  spotId,
  links,
}: {
  spotId: string;
  links: AnimeLink[];
}) {
  const [edits, setEdits] = useState<
    Record<string, { episode: string; sceneDescription: string; sceneTimestamp: string }>
  >(() =>
    Object.fromEntries(
      links.map((l) => [
        l.id,
        {
          episode: l.episode ?? "",
          sceneDescription: l.scene?.description ?? "",
          sceneTimestamp: l.scene?.timestamp ?? "",
        },
      ])
    )
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function save(linkId: string) {
    const edit = edits[linkId];
    if (!edit) return;

    setSaving(linkId);
    const res = await fetch(`/api/spots/${spotId}/links`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkId,
        episode: edit.episode || undefined,
        sceneDescription: edit.sceneDescription || undefined,
        sceneTimestamp: edit.sceneTimestamp || undefined,
      }),
    });
    const data = await res.json();
    setSaving(null);

    if (!res.ok) {
      toast.error(data.error ?? "儲存失敗");
      return;
    }

    toast.success(data.message ?? "已儲存");
  }

  if (links.length === 0) return null;

  return (
    <section className="mt-8 space-y-4">
      <h2 className="font-display text-lg font-bold">作品話數與場景</h2>
      <p className="text-sm text-muted-foreground">
        編輯此聖地對應的動畫話數、時間點與場景說明
      </p>
      {links.map((link) => (
        <Card key={link.id} className="space-y-3 p-4">
          <AnimeLinkTitle titles={link.anime.titles} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground">話數</label>
              <Input
                value={edits[link.id]?.episode ?? ""}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [link.id]: { ...prev[link.id], episode: e.target.value },
                  }))
                }
                placeholder="例：第 3 話、劇場版"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">時間點</label>
              <Input
                value={edits[link.id]?.sceneTimestamp ?? ""}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [link.id]: {
                      ...prev[link.id],
                      sceneTimestamp: e.target.value,
                    },
                  }))
                }
                placeholder="例：12:34"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">場景說明</label>
            <Textarea
              value={edits[link.id]?.sceneDescription ?? ""}
              onChange={(e) =>
                setEdits((prev) => ({
                  ...prev,
                  [link.id]: {
                    ...prev[link.id],
                    sceneDescription: e.target.value,
                  },
                }))
              }
              placeholder="描述動畫中的場景、鏡頭或台詞"
              rows={2}
              className="mt-1"
            />
          </div>
          <Button
            size="sm"
            onClick={() => save(link.id)}
            disabled={saving === link.id}
          >
            {saving === link.id ? "儲存中..." : "儲存話數資訊"}
          </Button>
        </Card>
      ))}
    </section>
  );
}
