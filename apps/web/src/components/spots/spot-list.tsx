import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { googleMapsPinUrl } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface SpotListItem {
  id: string;
  nameZh: string;
  prefecture?: string;
  latitude?: number;
  longitude?: number;
  address?: string | null;
}

export function SpotList({
  spots,
  showGoogleLink = false,
  compact = false,
}: {
  spots: SpotListItem[];
  showGoogleLink?: boolean;
  compact?: boolean;
}) {
  if (spots.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無聖地資料</p>;
  }

  return (
    <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {spots.map((s) => (
        <Card key={s.id} className="p-4 transition-colors hover:border-primary/30">
          <Link href={`/spots/${s.id}`} className="font-medium hover:text-primary">
            {s.nameZh}
          </Link>
          {s.prefecture && (
            <p className="mt-1 text-sm text-muted-foreground">{s.prefecture}</p>
          )}
          {showGoogleLink && s.latitude != null && s.longitude != null && (
            <a
              href={googleMapsPinUrl(s.latitude, s.longitude, s.nameZh)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Google 地圖
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
