"use client";

import { useState } from "react";
import { LIST_TYPES, type ListType } from "@seichi/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const LIST_TYPE_LABELS: Record<ListType, string> = {
  wishlist: "願望清單",
  top_picks: "精選推薦",
  photo_spots: "攝影聖地",
  region: "地區巡禮",
  custom: "自訂",
};

export interface ListRow {
  id: string;
  title: string;
  description: string | null;
  listType: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export function CreateListDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (list: ListRow) => void;
}) {
  const [title, setTitle] = useState("");
  const [listType, setListType] = useState<ListType>("custom");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), listType }),
    });
    setSaving(false);
    if (res.ok) {
      const list = await res.json();
      onCreated(list);
      setTitle("");
      setListType("custom");
      onClose();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? "建立失敗，請稍後再試");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-elevated">
        <h2 className="font-display text-lg font-bold">新增清單</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="清單名稱"
            autoFocus
          />
          <Select value={listType} onValueChange={(v) => setListType(v as ListType)}>
            <SelectTrigger>
              <SelectValue placeholder="清單類型" />
            </SelectTrigger>
            <SelectContent>
              {LIST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {LIST_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "建立中..." : "建立"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
