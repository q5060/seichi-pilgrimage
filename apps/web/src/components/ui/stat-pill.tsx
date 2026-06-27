import { cn } from "@/lib/utils";

interface StatPillProps {
  value: number | string;
  label: string;
  className?: string;
}

export function StatPill({ value, label, className }: StatPillProps) {
  return (
    <div
      className={cn(
        "glass rounded-xl px-6 py-4 text-center shadow-elevated",
        className
      )}
    >
      <div className="font-display text-2xl font-bold text-foreground md:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
