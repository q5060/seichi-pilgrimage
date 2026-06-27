"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
  }, []);

  useEffect(() => {
    if (!supported || !vapidKey) return;
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setEnabled(!!sub);
        if (sub) {
          const json = sub.toJSON();
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: json.endpoint,
              keys: json.keys,
            }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [supported, vapidKey]);

  async function subscribe() {
    if (!vapidKey) {
      setError("尚未設定推播金鑰（NEXT_PUBLIC_VAPID_PUBLIC_KEY）");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("需要允許通知權限");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) throw new Error("訂閱失敗");
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "無法啟用推播");
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    setLoading(true);
    setError("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE" });
        await sub.unsubscribe();
      }
      setEnabled(false);
    } catch {
      setError("取消訂閱失敗");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">此瀏覽器不支援推播通知</p>
    );
  }

  if (!vapidKey) {
    return (
      <p className="text-sm text-muted-foreground">
        推播功能尚未在此環境啟用
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-subtle bg-surface/50 p-4">
      <div className="flex items-start gap-3">
        {enabled ? (
          <Bell className="mt-0.5 h-5 w-5 text-primary" />
        ) : (
          <BellOff className="mt-0.5 h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">推播通知</p>
          <p className="text-xs text-muted-foreground">
            追蹤對象打卡、發布遊記時接收通知
          </p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>
      <Switch
        checked={enabled}
        disabled={loading}
        onCheckedChange={(on) => (on ? subscribe() : unsubscribe())}
      />
    </div>
  );
}
