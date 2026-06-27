"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterSection {
  title: string;
  children: React.ReactNode;
}

interface FilterDrawerProps {
  sections: FilterSection[];
  className?: string;
}

export function FilterDrawer({ sections, className }: FilterDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("lg:hidden", className)}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        篩選
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label="關閉篩選"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">篩選</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                  {section.children}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
