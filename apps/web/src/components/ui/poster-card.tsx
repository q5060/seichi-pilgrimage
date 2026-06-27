import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PosterCardProps {
  href: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  badge?: string;
  className?: string;
}

export function PosterCard({
  href,
  title,
  subtitle,
  imageUrl,
  badge,
  className,
}: PosterCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex-shrink-0 snap-start overflow-hidden rounded-xl border border-subtle bg-card shadow-elevated transition-all duration-300 hover:scale-[1.02] hover:border-primary/25 hover:shadow-glow-sm",
        "w-[140px] sm:w-[160px]",
        className
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-elevated">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="160px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-900/50 to-primary/15 p-4 text-center text-xs text-muted-foreground">
            {title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        {badge && (
          <span className="absolute right-2 top-2 rounded-full bg-primary/80 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight group-hover:text-primary">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Link>
  );
}
