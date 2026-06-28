"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Film, Search } from "lucide-react";
import Image from "next/image";
import { AnimeListSearchItem } from "@/components/lists/anime-list-search-item";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { List as ListIcon } from "lucide-react";

interface ListItem {
  item: {
    id: string;
    spotId: string | null;
    anilistId: number | null;
    notes: string | null;
    sortOrder: number;
  };
  spot: {
    id: string;
    nameZh: string;
    prefecture: string;
  } | null;
  anime: {
    anilistId: number;
    titles: { romaji?: string; english?: string; native?: string; chinese?: string };
    coverImage: string | null;
  } | null;
  animeTitle?: string | null;
}

function SortableListItem({
  id,
  notes,
  spot,
  anime,
  animeTitle,
  onRemove,
  onNotesChange,
}: {
  id: string;
  notes: string | null;
  spot: ListItem["spot"];
  anime: ListItem["anime"];
  animeTitle?: string | null;
  onRemove: () => void;
  onNotesChange: (notes: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!spot && !anime) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="flex flex-col gap-3 p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-muted-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          {anime ? (
            <Link href={`/anime/${anime.anilistId}`} className="flex flex-1 items-center gap-3">
              {anime.coverImage ? (
                <Image
                  src={anime.coverImage}
                  alt=""
                  width={40}
                  height={56}
                  className="rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-10 items-center justify-center rounded bg-muted">
                  <Film className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium">{animeTitle ?? "作品"}</p>
                <p className="text-sm text-muted-foreground">動畫作品</p>
              </div>
            </Link>
          ) : spot ? (
            <Link href={`/spots/${spot.id}`} className="flex-1">
              <p className="font-medium">{spot.nameZh}</p>
              <p className="text-sm text-muted-foreground">{spot.prefecture}</p>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-red-500"
            aria-label="移除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <Textarea
          value={notes ?? ""}
          onChange={(e) => onNotesChange(e.target.value)}
          onBlur={(e) => onNotesChange(e.target.value)}
          placeholder="備註（選填）"
          rows={2}
          className="text-sm"
        />
      </Card>
    </div>
  );
}

interface AnimeSearchHit {
  id?: number;
  anilistId?: number;
  titles?: { romaji?: string; english?: string; native?: string };
  title?: { native?: string };
  coverImage?: string | { large?: string } | null;
}

function getAnimeId(a: AnimeSearchHit): number {
  return a.anilistId ?? a.id ?? 0;
}

export default function ListDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { requireAuth, status } = useRequireAuth();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [animeQuery, setAnimeQuery] = useState("");
  const [animeResults, setAnimeResults] = useState<AnimeSearchHit[]>([]);
  const [animeSearching, setAnimeSearching] = useState(false);
  const [addingAnime, setAddingAnime] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (status === "loading") return;
    if (!requireAuth()) return;

    fetch(`/api/lists/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.list) setTitle(data.list.title);
        if (data.items) setItems(data.items);
      })
      .finally(() => setLoading(false));
  }, [id, status, requireAuth]);

  useEffect(() => {
    if (!animeQuery.trim()) {
      setAnimeResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setAnimeSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(animeQuery)}&type=anime&limit=8`
        );
        const data = await res.json();
        setAnimeResults(data.anime ?? []);
      } finally {
        setAnimeSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [animeQuery]);

  async function saveOrder(newItems: ListItem[]) {
    setSaving(true);
    await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: newItems.map((row, i) => ({
          id: row.item.id,
          sortOrder: i,
        })),
      }),
    });
    setSaving(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((row) => row.item.id === active.id);
    const newIndex = items.findIndex((row) => row.item.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    saveOrder(reordered);
  }

  async function removeItem(itemId: string) {
    const res = await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeItemId: itemId }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((row) => row.item.id !== itemId));
    }
  }

  async function saveItemNotes(itemId: string, notes: string) {
    setItems((prev) =>
      prev.map((row) =>
        row.item.id === itemId ? { ...row, item: { ...row.item, notes } } : row
      )
    );
    await fetch(`/api/lists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateItem: { id: itemId, notes } }),
    });
  }

  async function addAnime(anilistId: number, animeTitle: string, coverImage: string | null) {
    setAddingAnime(true);
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addItem: { anilistId } }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "加入失敗");
        return;
      }
      const data = await res.json();
      setItems((prev) => [
        ...prev,
        {
          item: data.item,
          spot: null,
          anime: {
            anilistId,
            titles: { native: animeTitle },
            coverImage,
          },
          animeTitle,
        },
      ]);
      setAnimeQuery("");
      setAnimeResults([]);
    } finally {
      setAddingAnime(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    );
  }

  return (
    <PageShell variant="prose">
      <PageHeader
        title={title}
        breadcrumbs={[{ label: "清單", href: "/lists" }, { label: title }]}
        action={
          saving ? (
            <span className="text-xs text-muted-foreground">儲存中...</span>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title="清單是空的"
          description="加入聖地或作品開始建立你的巡禮清單"
          actionLabel="探索聖地"
          actionHref="/spots/map"
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((row) => row.item.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-6 space-y-2">
              {items.map((row) => (
                <SortableListItem
                  key={row.item.id}
                  id={row.item.id}
                  notes={row.item.notes}
                  spot={row.spot}
                  anime={row.anime}
                  animeTitle={row.animeTitle}
                  onRemove={() => removeItem(row.item.id)}
                  onNotesChange={(notes) => saveItemNotes(row.item.id, notes)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={animeQuery}
            onChange={(e) => setAnimeQuery(e.target.value)}
            placeholder="搜尋作品加入清單..."
            className="pl-9"
          />
          {animeQuery.trim() && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {animeSearching && (
                <p className="p-3 text-sm text-muted-foreground">搜尋中...</p>
              )}
              {!animeSearching && animeResults.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">找不到作品</p>
              )}
              {animeResults.map((a) => (
                <AnimeListSearchItem
                  key={getAnimeId(a)}
                  anime={a}
                  disabled={addingAnime}
                  onSelect={(anilistId, title, cover) => addAnime(anilistId, title, cover)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => router.push("/spots/map")}>
            加入聖地
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
