import { db, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { AppLocale } from "@/i18n/routing";

export async function getUserPreferredLocale(userId: string): Promise<AppLocale> {
  const [user] = await db
    .select({ preferredLocale: users.preferredLocale })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.preferredLocale === "ja" ? "ja" : "zh-TW";
}

export async function setUserPreferredLocale(
  userId: string,
  locale: AppLocale
): Promise<void> {
  await db
    .update(users)
    .set({ preferredLocale: locale, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
