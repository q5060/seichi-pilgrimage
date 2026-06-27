"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const REASONS = [
  { value: "incorrect_info", label: "資訊錯誤" },
  { value: "spam", label: "垃圾內容" },
  { value: "harassment", label: "騷擾或不當內容" },
  { value: "copyright", label: "版權問題" },
  { value: "other", label: "其他" },
];

export function ReportButton({
  targetType,
  targetId,
  label = "檢舉",
}: {
  targetType: string;
  targetId: string;
  label?: string;
}) {
  const { requireAuth } = useRequireAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("incorrect_info");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;

    setSubmitting(true);
    setError("");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, details }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "提交失敗");
      return;
    }
    setDone(true);
    setOpen(false);
  }

  if (done) {
    return <p className="text-xs text-emerald-400">檢舉已提交</p>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!requireAuth()) return;
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
      >
        <Flag className="h-3 w-3" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md space-y-4 p-6">
            <h3 className="font-display font-bold">檢舉內容</h3>
            <form onSubmit={submit} className="space-y-4">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="補充說明（選填）"
                rows={3}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "提交中..." : "提交檢舉"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
