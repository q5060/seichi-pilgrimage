"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SpotPickerValue {
  spotId: string;
  name: string;
  prefecture: string;
}

interface SpotSearchHit {
  id: string;
  nameZh: string;
  prefecture: string;
}

export function SpotPicker({
  value,
  onChange,
  className,
}: {
  value?: SpotPickerValue | null;
  onChange: (spot: SpotPickerValue) => void;
  className?: string;
}) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<SpotSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value?.name) setQuery(value.name);
  }, [value?.spotId, value?.name]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&type=spots&limit=8`
      );
      const data = await res.json();
      setResults(
        (data.spots ?? []).map((s: SpotSearchHit) => ({
          id: s.id,
          nameZh: s.nameZh,
          prefecture: s.prefecture,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  function selectSpot(spot: SpotSearchHit) {
    onChange({
      spotId: spot.id,
      name: spot.nameZh,
      prefecture: spot.prefecture,
    });
    setQuery(spot.nameZh);
    setOpen(false);
    setResults([]);
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="搜尋聖地名稱..."
      />
      {value?.spotId && (
        <p className="mt-1 text-xs text-muted-foreground">
          已選：{value.name}（{value.prefecture}）
        </p>
      )}
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {loading && (
            <p className="p-3 text-sm text-muted-foreground">搜尋中...</p>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <p className="p-3 text-sm text-muted-foreground">找不到聖地</p>
          )}
          {results.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => selectSpot(spot)}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium">{spot.nameZh}</span>
              <span className="text-muted-foreground">{spot.prefecture}</span>
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full rounded-none"
            onClick={() => setOpen(false)}
          >
            關閉
          </Button>
        </div>
      )}
    </div>
  );
}
