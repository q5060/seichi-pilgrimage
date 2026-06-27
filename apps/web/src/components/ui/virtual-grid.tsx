"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualGridProps<T> {
  items: T[];
  columns?: number;
  estimateRowHeight?: number;
  maxHeight?: string;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualGrid<T>({
  items,
  columns = 3,
  estimateRowHeight = 280,
  maxHeight = "calc(100vh - 14rem)",
  getKey,
  renderItem,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 2,
  });

  if (items.length === 0) return null;

  return (
    <div
      ref={parentRef}
      className="overflow-auto scrollbar-thin"
      style={{ maxHeight }}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = items.slice(start, start + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map((item, colIndex) => (
                <div key={getKey(item, start + colIndex)}>
                  {renderItem(item, start + colIndex)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
