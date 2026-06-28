import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { locales, type AppLocale } from "@/i18n/routing";
import { setUserPreferredLocale } from "@/lib/user-locale";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { locale?: string };
  const locale = body.locale;
  if (!locale || !locales.includes(locale as AppLocale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  await setUserPreferredLocale(session.user.id, locale as AppLocale);
  return NextResponse.json({ success: true });
}
