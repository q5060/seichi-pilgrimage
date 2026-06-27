import { db, pushSubscriptions } from "@seichi/db";
import { eq } from "drizzle-orm";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string
  ) => Promise<void>;
};

let webPush: WebPushModule | null = null;

async function getWebPush(): Promise<WebPushModule | null> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@seichi.local";

  if (!publicKey || !privateKey) return null;

  if (!webPush) {
    try {
      const mod = await import("web-push");
      const instance = (mod.default ?? mod) as WebPushModule;
      instance.setVapidDetails(subject, publicKey, privateKey);
      webPush = instance;
    } catch {
      return null;
    }
  }

  return webPush;
}

export async function sendPush(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const wp = await getWebPush();
  if (!wp) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return { sent: 0, failed: 0 };

  const message = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message
        );
        sent++;
      } catch {
        failed++;
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }
    })
  );

  return { sent, failed };
}
