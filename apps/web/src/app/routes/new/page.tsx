"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { googleMapsDirectionsUrl, estimateRouteMetrics } from "@/lib/utils";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Stop {
  spotId: string;
  nameZh: string;
  lat: number;
  lng: number;
  stayMinutes: number;
  dayIndex: number;
}

function SortableStop({
  stop,
  index,
  onStayChange,
  onDayChange,
  onRemove,
}: {
  stop: Stop;
  index: number;
  onStayChange: (minutes: number) => void;
  onDayChange: (day: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.spotId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="flex items-center gap-3 p-3">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-elevated hover:text-foreground"
          aria-label="拖曳排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="w-6 text-sm font-bold text-muted-foreground">{index + 1}</span>
        <span className="min-w-0 flex-1 truncate">{stop.nameZh}</span>
        <Select
          value={String(stop.dayIndex)}
          onValueChange={(v) => onDayChange(Number(v))}
        >
          <SelectTrigger className="h-9 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <SelectItem key={d} value={String(d)}>
                第{d}天
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={stop.stayMinutes}
          onChange={(e) => onStayChange(Number(e.target.value))}
          className="h-9 w-16"
          min={5}
        />
        <span className="text-xs text-muted-foreground">分</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="移除"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardContent>
    </Card>
  );
}

function NewRoutePageInner() {
  const searchParams = useSearchParams();
  const addSpotId = searchParams.get("addSpot");

  const [title, setTitle] = useState("我的巡禮路線");
  const [stops, setStops] = useState<Stop[]>([]);
  const [availableSpots, setAvailableSpots] = useState<
    { id: string; nameZh: string; latitude: number; longitude: number }[]
  >([]);
  const [savedId, setSavedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetch("/api/spots?limit=500")
      .then((r) => r.json())
      .then((data) =>
        setAvailableSpots(Array.isArray(data) ? data : data.items ?? [])
      );
  }, []);

  useEffect(() => {
    if (addSpotId && availableSpots.length > 0) {
      addStop(addSpotId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSpotId, availableSpots.length]);

  function addStop(spotId: string) {
    const spot = availableSpots.find((s) => s.id === spotId);
    if (!spot || stops.some((s) => s.spotId === spotId)) return;
    setStops((prev) => [
      ...prev,
      {
        spotId: spot.id,
        nameZh: spot.nameZh,
        lat: spot.latitude,
        lng: spot.longitude,
        stayMinutes: 30,
        dayIndex: prev.length > 0 ? prev[prev.length - 1].dayIndex : 1,
      },
    ]);
  }

  function removeStop(index: number) {
    setStops(stops.filter((_, i) => i !== index));
  }

  function updateStay(index: number, minutes: number) {
    const ns = [...stops];
    ns[index].stayMinutes = minutes;
    setStops(ns);
  }

  function updateDay(index: number, day: number) {
    const ns = [...stops];
    ns[index].dayIndex = day;
    setStops(ns);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stops.findIndex((s) => s.spotId === active.id);
    const newIndex = stops.findIndex((s) => s.spotId === over.id);
    setStops(arrayMove(stops, oldIndex, newIndex));
  }

  const metrics = estimateRouteMetrics(
    stops.map((s) => ({ lat: s.lat, lng: s.lng, stayMinutes: s.stayMinutes }))
  );
  const mapsUrl = googleMapsDirectionsUrl(stops.map((s) => ({ lat: s.lat, lng: s.lng })));

  async function saveRoute() {
    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        stops: stops.map((s) => ({
          spotId: s.spotId,
          stayMinutes: s.stayMinutes,
          dayIndex: s.dayIndex,
        })),
        isPublic: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "儲存路線失敗，請稍後再試");
      return;
    }
    setSavedId(data.id);
    toast.success("路線已儲存");
  }

  return (
    <PageShell variant="prose">
      <PageHeader
        title="路線規劃器"
        description="拖曳調整順序，設定每日行程與停留時間"
        breadcrumbs={[{ label: "路線", href: "/routes" }, { label: "新增" }]}
      />

      <Input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="路線名稱"
        className="text-lg font-semibold"
      />

      <Select
        onValueChange={(v) => {
          addStop(v);
        }}
        value=""
      >
        <SelectTrigger className="mt-4">
          <SelectValue placeholder="加入聖地..." />
        </SelectTrigger>
        <SelectContent>
          {availableSpots.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.nameZh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="mt-2 text-xs text-muted-foreground">
        長按拖曳把手可調整順序；也可從地圖或聖地頁以「加入路線」帶入
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stops.map((s) => s.spotId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-6 space-y-2">
            {stops.map((stop, i) => (
              <SortableStop
                key={stop.spotId}
                stop={stop}
                index={i}
                onStayChange={(m) => updateStay(i, m)}
                onDayChange={(d) => updateDay(i, d)}
                onRemove={() => removeStop(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {stops.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4 text-sm text-muted-foreground">
            <p>總距離：約 {(metrics.distanceM / 1000).toFixed(1)} 公里</p>
            <p>
              預估時間：約 {Math.floor(metrics.minutes / 60)} 小時{" "}
              {metrics.minutes % 60} 分鐘
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={saveRoute} disabled={stops.length === 0}>
          儲存路線
        </Button>
        {stops.length > 0 && (
          <Button variant="secondary" asChild>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              匯出 Google Maps
            </a>
          </Button>
        )}
        {savedId && (
          <Button variant="outline" asChild>
            <Link href={`/routes/${savedId}`}>查看路線</Link>
          </Button>
        )}
      </div>
    </PageShell>
  );
}

export default function NewRoutePage() {
  return (
    <Suspense fallback={<PageShell variant="prose"><div className="h-40 animate-pulse rounded-xl bg-elevated" /></PageShell>}>
      <NewRoutePageInner />
    </Suspense>
  );
}
