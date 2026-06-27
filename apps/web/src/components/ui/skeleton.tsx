import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-lg bg-gradient-to-r from-surface via-elevated to-surface bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
