"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimeMetaEditFormProps {
  anilistId: number;
  initial: {
    suggestedDays?: number | null;
    etiquetteNotes?: string | null;
    customTitle?: string | null;
  };
}

export function AnimeMetaEditForm({ anilistId, initial }: AnimeMetaEditFormProps) {
  const [form, setForm] = useState({
    suggestedDays: initial.suggestedDays?.toString() ?? "",
    etiquetteNotes: initial.etiquetteNotes ?? "",
    customTitle: initial.customTitle ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/anime/${anilistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meta: {
          suggestedDays: form.suggestedDays
            ? Number(form.suggestedDays)
            : undefined,
          etiquetteNotes: form.etiquetteNotes || undefined,
          customTitle: form.customTitle || undefined,
        },
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(data.error ?? "提交失敗");
      return;
    }

    toast.success(data.message ?? "已提交");
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">協作編輯巡禮資訊</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">自訂標題</label>
            <Input
              value={form.customTitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, customTitle: e.target.value }))
              }
              placeholder="社群慣用名稱（選填）"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">建議天數</label>
            <Input
              type="number"
              min={1}
              value={form.suggestedDays}
              onChange={(e) =>
                setForm((f) => ({ ...f, suggestedDays: e.target.value }))
              }
              placeholder="例：2"
              className="mt-1 w-32"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">巡禮禮儀與注意事項</label>
            <Textarea
              value={form.etiquetteNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, etiquetteNotes: e.target.value }))
              }
              placeholder="分享巡禮時應注意的事項"
              rows={3}
              className="mt-1"
            />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "提交中..." : "提交協作編輯"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
