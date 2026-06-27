"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LOCATION_REPORT_TYPES, LOCATION_REPORT_LABELS } from "@seichi/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LocationReportForm({ spotId }: { spotId: string }) {
  const [reportType, setReportType] = useState<string>("still_open");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/location-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotId, reportType, notes }),
    });
    setLoading(false);
    toast.success("感謝你的回報！");
    setNotes("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">回報現況</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_REPORT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {LOCATION_REPORT_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="補充說明（選填）"
            rows={2}
          />
          <Button type="submit" variant="secondary" className="w-full" disabled={loading}>
            {loading ? "提交中..." : "提交回報"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
