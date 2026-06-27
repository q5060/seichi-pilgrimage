"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TravelogueBlockType } from "@seichi/shared";
import { TRAVELOGUE_BLOCK_TYPES } from "@seichi/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollaboratorsPanel } from "@/components/collaborators-panel";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SpotPicker } from "@/components/travelogue/spot-picker";
import { uploadImageFile } from "@/components/travelogue/image-upload";

export interface TravelogueBlock {
  id: string;
  type: TravelogueBlockType;
  data: Record<string, unknown>;
}

const BLOCK_LABELS: Record<TravelogueBlockType, string> = {
  paragraph: "段落",
  heading: "標題",
  quote: "引用",
  spot_card: "聖地卡片",
  route_segment: "路線段",
  photo_gallery: "相片集",
  comparison: "對比照",
  map_embed: "地圖連結",
  expense: "花費",
};

function newBlock(type: TravelogueBlockType): TravelogueBlock {
  const id = crypto.randomUUID();
  switch (type) {
    case "heading":
      return { id, type, data: { text: "" } };
    case "quote":
      return { id, type, data: { text: "" } };
    case "spot_card":
      return { id, type, data: { spotId: "", name: "", prefecture: "" } };
    case "route_segment":
      return { id, type, data: { from: "", to: "", transport: "", minutes: "" } };
    case "photo_gallery":
      return { id, type, data: { urls: [""], caption: "" } };
    case "comparison":
      return { id, type, data: { photoUrl: "", screenshotUrl: "", caption: "" } };
    case "map_embed":
      return { id, type, data: { url: "", label: "" } };
    case "expense":
      return { id, type, data: { category: "", amount: "", currency: "JPY", note: "" } };
    default:
      return { id, type: "paragraph", data: { html: "" } };
  }
}

function ImageUrlField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImageFile(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`${label} URL`}
      />
      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-primary hover:underline">
        {uploading ? "上傳中..." : `上傳${label}`}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={handleFile}
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onRemove,
  allBlocks,
  blockIndex,
}: {
  block: TravelogueBlock;
  onChange: (b: TravelogueBlock) => void;
  onRemove: () => void;
  allBlocks?: TravelogueBlock[];
  blockIndex?: number;
}) {
  const updateData = (key: string, value: unknown) => {
    onChange({ ...block, data: { ...block.data, [key]: value } });
  };

  async function fillMapFromSpot() {
    let spotId = block.data.spotId as string | undefined;
    if (!spotId && allBlocks != null && blockIndex != null) {
      for (let i = blockIndex - 1; i >= 0; i--) {
        const prev = allBlocks[i];
        if (prev.type === "spot_card" && prev.data.spotId) {
          spotId = prev.data.spotId as string;
          break;
        }
      }
    }
    if (!spotId) return;

    const res = await fetch(`/api/spots/${spotId}`);
    if (!res.ok) return;
    const data = await res.json();
    const spot = data.spot ?? data;
    const lat = spot.latitude as number;
    const lng = spot.longitude as number;
    const name = (spot.nameZh as string) ?? "";
    const url =
      (spot.googleMapsUrl as string | undefined) ??
      (spot.osmUrl as string | undefined) ??
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

    onChange({
      ...block,
      data: {
        ...block.data,
        url,
        label: name,
        spotId,
      },
    });
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {BLOCK_LABELS[block.type]}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-auto p-0 text-xs text-destructive hover:text-destructive">
          移除
        </Button>
      </div>

      {block.type === "heading" && (
        <Input
          value={(block.data.text as string) ?? ""}
          onChange={(e) => updateData("text", e.target.value)}
          placeholder="標題文字"
          className="font-bold"
        />
      )}

      {block.type === "quote" && (
        <Textarea
          value={(block.data.text as string) ?? ""}
          onChange={(e) => updateData("text", e.target.value)}
          placeholder="引用內容"
          className="italic"
          rows={2}
        />
      )}

      {block.type === "spot_card" && (
        <SpotPicker
          value={
            block.data.spotId
              ? {
                  spotId: block.data.spotId as string,
                  name: (block.data.name as string) ?? "",
                  prefecture: (block.data.prefecture as string) ?? "",
                }
              : null
          }
          onChange={(spot) =>
            onChange({
              ...block,
              data: {
                spotId: spot.spotId,
                name: spot.name,
                prefecture: spot.prefecture,
              },
            })
          }
        />
      )}

      {block.type === "route_segment" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={(block.data.from as string) ?? ""}
            onChange={(e) => updateData("from", e.target.value)}
            placeholder="起點"
          />
          <Input
            value={(block.data.to as string) ?? ""}
            onChange={(e) => updateData("to", e.target.value)}
            placeholder="終點"
          />
          <Input
            value={(block.data.transport as string) ?? ""}
            onChange={(e) => updateData("transport", e.target.value)}
            placeholder="交通方式"
          />
          <Input
            value={(block.data.minutes as string) ?? ""}
            onChange={(e) => updateData("minutes", e.target.value)}
            placeholder="所需時間（分鐘）"
          />
        </div>
      )}

      {block.type === "photo_gallery" && (
        <div className="space-y-2">
          <div className="space-y-2">
            {((block.data.urls as string[]) ?? [""]).map((url, i) => (
              <div key={i} className="flex gap-2">
                <ImageUrlField
                  label="相片"
                  value={url}
                  onChange={(next) => {
                    const urls = [...((block.data.urls as string[]) ?? [""])];
                    urls[i] = next;
                    updateData("urls", urls.filter(Boolean));
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const urls = [...((block.data.urls as string[]) ?? [])];
                    urls.splice(i, 1);
                    updateData("urls", urls.length ? urls : [""]);
                  }}
                >
                  移除
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateData("urls", [
                  ...((block.data.urls as string[]) ?? []).filter(Boolean),
                  "",
                ])
              }
            >
              + 新增相片
            </Button>
          </div>
          <Input
            value={(block.data.caption as string) ?? ""}
            onChange={(e) => updateData("caption", e.target.value)}
            placeholder="說明"
          />
        </div>
      )}

      {block.type === "comparison" && (
        <div className="space-y-2">
          <ImageUrlField
            label="實拍相片"
            value={(block.data.photoUrl as string) ?? ""}
            onChange={(url) => updateData("photoUrl", url)}
          />
          <ImageUrlField
            label="動畫截圖"
            value={(block.data.screenshotUrl as string) ?? ""}
            onChange={(url) => updateData("screenshotUrl", url)}
          />
          <Input
            value={(block.data.caption as string) ?? ""}
            onChange={(e) => updateData("caption", e.target.value)}
            placeholder="說明"
          />
        </div>
      )}

      {block.type === "map_embed" && (
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={fillMapFromSpot}>
            從聖地卡片帶入地圖連結
          </Button>
          <Input
            value={(block.data.url as string) ?? ""}
            onChange={(e) => updateData("url", e.target.value)}
            placeholder="Google 地圖連結"
          />
          <Input
            value={(block.data.label as string) ?? ""}
            onChange={(e) => updateData("label", e.target.value)}
            placeholder="顯示標籤"
          />
        </div>
      )}

      {block.type === "expense" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={(block.data.category as string) ?? ""}
            onChange={(e) => updateData("category", e.target.value)}
            placeholder="類別（交通、餐飲…）"
          />
          <Input
            value={(block.data.amount as string) ?? ""}
            onChange={(e) => updateData("amount", e.target.value)}
            placeholder="金額"
          />
          <Input
            value={(block.data.note as string) ?? ""}
            onChange={(e) => updateData("note", e.target.value)}
            placeholder="備註"
            className="col-span-2"
          />
        </div>
      )}
    </Card>
  );
}

function ParagraphBlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: TravelogueBlock;
  onChange: (b: TravelogueBlock) => void;
  onRemove: () => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "撰寫段落..." }),
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: (block.data.html as string) ?? "",
    onUpdate: ({ editor: ed }) => {
      onChange({ ...block, data: { html: ed.getHTML() } });
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm prose-invert max-w-none min-h-[100px] p-3 focus:outline-none",
      },
    },
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface/50 p-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={cn(editor?.isActive("bold") && "bg-white/10")}
          >
            粗體
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(editor?.isActive("heading", { level: 3 }) && "bg-white/10")}
          >
            小標
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-auto p-0 text-xs text-destructive hover:text-destructive"
        >
          移除
        </Button>
      </div>
      <EditorContent editor={editor} />
    </Card>
  );
}

export function TravelogueEditor({
  initialSlug,
  initialTitle = "",
  initialExcerpt = "",
  initialSeriesName = "",
  initialSeriesOrder = "",
  initialBlocks = [],
  isOwner = true,
}: {
  initialSlug?: string;
  initialTitle?: string;
  initialExcerpt?: string;
  initialSeriesName?: string;
  initialSeriesOrder?: number | string;
  initialBlocks?: TravelogueBlock[];
  isOwner?: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [seriesName, setSeriesName] = useState(initialSeriesName);
  const [seriesOrder, setSeriesOrder] = useState(
    initialSeriesOrder ? String(initialSeriesOrder) : ""
  );
  const [blocks, setBlocks] = useState<TravelogueBlock[]>(
    initialBlocks.length > 0
      ? initialBlocks
      : [{ id: crypto.randomUUID(), type: "paragraph", data: { html: "" } }]
  );
  const [publishing, setPublishing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initialSnapshot = useRef(
    JSON.stringify({
      title: initialTitle,
      excerpt: initialExcerpt,
      seriesName: initialSeriesName,
      seriesOrder: initialSeriesOrder ? String(initialSeriesOrder) : "",
      blocks: initialBlocks,
    })
  );

  const isDirty =
    JSON.stringify({
      title,
      excerpt,
      seriesName,
      seriesOrder,
      blocks,
    }) !== initialSnapshot.current;

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const addBlock = useCallback((type: TravelogueBlockType) => {
    setBlocks((prev) => [...prev, newBlock(type)]);
  }, []);

  const updateBlock = useCallback((index: number, block: TravelogueBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  }, []);

  const removeBlock = useCallback((index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  async function save(publish: boolean) {
    if (!title) return;
    setPublishing(true);
    setSaveError(null);

    const url = initialSlug
      ? `/api/travelogues/${initialSlug}`
      : "/api/travelogues";
    const method = initialSlug ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          excerpt,
          seriesName: seriesName || null,
          seriesOrder: seriesOrder ? Number(seriesOrder) : null,
          content: blocks,
          isPublished: publish,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data.error ?? "儲存失敗，請稍後再試";
        setSaveError(message);
        toast.error(message);
        return;
      }

      initialSnapshot.current = JSON.stringify({
        title,
        excerpt,
        seriesName,
        seriesOrder,
        blocks,
      });
      router.push(`/travelogue/${data.slug ?? initialSlug}`);
    } catch {
      const message = "儲存失敗，請稍後再試";
      setSaveError(message);
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="font-display text-2xl font-bold">
        {initialSlug ? "編輯遊記" : "撰寫遊記"}
      </h1>

      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="遊記標題"
        className="text-xl font-bold"
      />

      <Input
        type="text"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="摘要（選填）"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          type="text"
          value={seriesName}
          onChange={(e) => setSeriesName(e.target.value)}
          placeholder="系列名稱（選填）"
        />
        <Input
          type="number"
          value={seriesOrder}
          onChange={(e) => setSeriesOrder(e.target.value)}
          placeholder="系列排序（選填）"
          min={1}
        />
      </div>

      <div className="space-y-4">
        {blocks.map((block, i) =>
          block.type === "paragraph" ? (
            <ParagraphBlockEditor
              key={block.id}
              block={block}
              onChange={(b) => updateBlock(i, b)}
              onRemove={() => removeBlock(i)}
            />
          ) : (
            <BlockEditor
              key={block.id}
              block={block}
              onChange={(b) => updateBlock(i, b)}
              onRemove={() => removeBlock(i)}
              allBlocks={blocks}
              blockIndex={i}
            />
          )
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TRAVELOGUE_BLOCK_TYPES.filter((t) => t !== "paragraph").map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addBlock(type)}
          >
            + {BLOCK_LABELS[type]}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addBlock("paragraph")}>
          + 段落
        </Button>
      </div>

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      <div className="flex gap-4">
        <Button variant="secondary" onClick={() => save(false)} disabled={publishing}>
          儲存草稿
        </Button>
        <Button onClick={() => save(true)} disabled={publishing}>
          {publishing ? "發布中..." : "發布遊記"}
        </Button>
      </div>

      {initialSlug && (
        <CollaboratorsPanel
          apiPath={`/api/travelogues/${initialSlug}/collaborators`}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}
