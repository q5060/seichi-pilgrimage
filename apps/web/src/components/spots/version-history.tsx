import { formatDate } from "@/lib/utils";

interface VersionEntry {
  version: {
    id: string;
    changeSummary: string | null;
    moderationStatus: string;
    createdAt: Date;
    snapshot: unknown;
  };
  editor: { id: string; name: string | null };
}

export function SpotVersionHistory({ versions }: { versions: VersionEntry[] }) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無編輯紀錄</p>;
  }

  const statusLabels: Record<string, string> = {
    pending: "待審核",
    approved: "已核准",
    rejected: "已拒絕",
  };

  return (
    <ol className="relative border-l border-border pl-6">
      {versions.map(({ version, editor }) => (
        <li key={version.id} className="mb-6 last:mb-0">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{editor.name ?? "匿名"}</span>
              <span className="text-muted-foreground">{formatDate(version.createdAt)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  version.moderationStatus === "approved"
                    ? "bg-success/15 text-success"
                    : version.moderationStatus === "pending"
                      ? "bg-warning/15 text-warning"
                      : "bg-destructive/15 text-destructive"
                }`}
              >
                {statusLabels[version.moderationStatus] ?? version.moderationStatus}
              </span>
            </div>
            {version.changeSummary && (
              <p className="mt-1 text-muted-foreground">{version.changeSummary}</p>
            )}
            {(() => {
              const snap = version.snapshot as {
                before?: Record<string, unknown>;
                after?: Record<string, unknown>;
              } | null;
              return snap?.after ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {Object.entries(snap.after).map(([key, val]) => (
                    <li key={key}>
                      <span className="font-medium">{key}</span>：{String(val)}
                    </li>
                  ))}
                </ul>
              ) : null;
            })()}
          </div>
        </li>
      ))}
    </ol>
  );
}
