"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";

export function usePendingPath() {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const isActive = useCallback(
    (href: string) => {
      const current = pendingPath ?? pathname;
      return current === href || (href !== "/" && current.startsWith(href));
    },
    [pathname, pendingPath]
  );

  const onNavigate = useCallback((href: string) => {
    setPendingPath(href);
  }, []);

  return { isActive, onNavigate, pendingPath };
}
