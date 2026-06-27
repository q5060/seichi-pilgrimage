"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintRouteButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" />
      列印 / 儲存 PDF
    </Button>
  );
}
