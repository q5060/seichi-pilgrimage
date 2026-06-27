import { cn } from "@/lib/utils";

interface FilterSection {
  title: string;
  children: React.ReactNode;
}

interface FilterSidebarProps {
  sections: FilterSection[];
  className?: string;
}

export function FilterSidebar({ sections, className }: FilterSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden w-56 shrink-0 space-y-6 lg:block",
        className
      )}
    >
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </h3>
          {section.children}
        </div>
      ))}
    </aside>
  );
}

export function FilterLink({
  active,
  href,
  onClick,
  children,
}: {
  active?: boolean;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className = cn(
    "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
    active
      ? "bg-primary/12 font-medium text-primary"
      : "text-muted-foreground hover:bg-elevated hover:text-foreground"
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
