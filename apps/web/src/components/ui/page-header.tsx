import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  action?: React.ReactNode;
  className?: string;
  variant?: "default" | "centered";
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  className,
  variant = "default",
}: PageHeaderProps) {
  const isCentered = variant === "centered";

  return (
    <div className={cn("mb-8", isCentered && "text-center", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          className={cn(
            "mb-3 flex items-center gap-1 text-sm text-muted-foreground",
            isCentered && "justify-center"
          )}
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div
        className={cn(
          "flex items-start justify-between gap-4",
          isCentered && "flex-col items-center"
        )}
      >
        <div className={cn(isCentered && "max-w-2xl")}>
          <h1 className={cn("text-title", isCentered && "text-gradient-brand")}>
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {(description || isCentered) && (
        <div
          className={cn(
            "mt-6 h-px bg-gradient-to-r from-transparent via-border to-transparent",
            isCentered && "mx-auto max-w-xs"
          )}
        />
      )}
    </div>
  );
}
