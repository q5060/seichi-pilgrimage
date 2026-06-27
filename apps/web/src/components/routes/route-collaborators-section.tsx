"use client";

import { useEffect, useState } from "react";
import { CollaboratorsPanel } from "@/components/collaborators-panel";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

export function RouteCollaboratorsSection({
  routeId,
  isOwner,
}: {
  routeId: string;
  isOwner: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function copyInviteLink() {
    const res = await fetch(`/api/routes/${routeId}/invite`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "無法產生邀請連結");
      return;
    }
    const url = `${window.location.origin}${data.inviteUrl}`;
    await navigator.clipboard.writeText(url);
    toast.success("邀請連結已複製");
  }

  if (!mounted || !isOwner) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-lg font-bold">協作邀請</h3>
        <Button type="button" variant="outline" size="sm" onClick={copyInviteLink}>
          <Link2 className="h-4 w-4" />
          複製邀請連結
        </Button>
      </div>
      <CollaboratorsPanel
        apiPath={`/api/routes/${routeId}/collaborators`}
        title="路線協作者"
        isOwner={isOwner}
      />
    </div>
  );
}
