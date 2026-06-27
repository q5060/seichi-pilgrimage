"use client";

import { cn } from "@/lib/utils";

interface ChipFilterProps<T extends string> {
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T | "") => void;
  allLabel?: string;
  className?: string;
}

export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  allLabel = "全部",
  className,
}: ChipFilterProps<T>) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-2 scrollbar-thin",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("")}
        className={cn(
          "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          value === ""
            ? "border border-primary/20 bg-primary/15 text-primary shadow-glow-sm"
            : "border border-transparent bg-surface text-muted-foreground hover:bg-elevated hover:text-foreground"
        )}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            value === opt.value
              ? "border border-primary/20 bg-primary/15 text-primary shadow-glow-sm"
              : "border border-transparent bg-surface text-muted-foreground hover:bg-elevated hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
