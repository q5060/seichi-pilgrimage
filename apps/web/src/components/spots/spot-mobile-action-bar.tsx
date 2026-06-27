"use client";

import { MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToListButton } from "./add-to-list-button";

interface SpotMobileActionBarProps {
  spotId: string;
  mapsUrl: string;
}

export function SpotMobileActionBar({ spotId, mapsUrl }: SpotMobileActionBarProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button asChild className="flex-1 gap-2">
          <a href="#visit-form">
            <CheckCircle className="h-4 w-4" />
            打卡
          </a>
        </Button>
        <Button variant="glass" size="icon" asChild>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" aria-label="Google 地圖">
            <MapPin className="h-4 w-4" />
          </a>
        </Button>
        <div className="[&_button]:glass [&_button]:h-10 [&_button]:w-10 [&_button]:rounded-lg [&_button]:p-0 [&_button]:border [&_button]:border-border">
          <AddToListButton spotId={spotId} iconOnly />
        </div>
      </div>
    </div>
  );
}
