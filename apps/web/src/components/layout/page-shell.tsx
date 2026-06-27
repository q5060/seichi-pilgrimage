import { cn } from "@/lib/utils";

const variants = {
  wide: "max-w-7xl",
  standard: "max-w-5xl",
  narrow: "max-w-2xl",
  prose: "max-w-3xl",
} as const;

interface PageShellProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  noPadding?: boolean;
}

export function PageShell({
  children,
  variant = "wide",
  className,
  noPadding = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4",
        !noPadding && "py-8 pb-24 md:pb-8",
        variants[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
