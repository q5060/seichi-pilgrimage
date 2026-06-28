import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getWrappedStats } from "@/lib/wrapped-data";
import { getRequestLocale } from "@/lib/display-names-server";

export const revalidate = 120;

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ id: string; year: string }>;
}) {
  const { id, year: yearStr } = await params;
  const year = Number(yearStr);
  if (!year || year < 2000 || year > 2100) notFound();

  const session = await auth();

  let userId = id;
  if (id === "me") {
    if (!session?.user?.id) redirect("/auth/signin");
    userId = session.user.id;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) notFound();

  const locale = await getRequestLocale();
  const wrapped = await getWrappedStats(userId, year, locale);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-brand-900 via-brand-800 to-background">
      <div className="mx-auto max-w-2xl px-4 py-12 text-foreground">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          年度巡禮回顧
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold">{year}</h1>
        <p className="mt-2 text-muted-foreground">{user.name} 的巡禮之旅</p>

        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="glass rounded-lg p-6">
            <div className="font-display text-4xl font-bold">{wrapped.visitCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">次打卡</div>
          </div>
          <div className="glass rounded-lg p-6">
            <div className="font-display text-4xl font-bold">
              {wrapped.totalDistanceM >= 1000
                ? `${(wrapped.totalDistanceM / 1000).toFixed(1)} km`
                : `${wrapped.totalDistanceM} m`}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">巡禮里程</div>
          </div>
          <div className="glass rounded-lg p-6">
            <div className="font-display text-4xl font-bold">{wrapped.prefectures.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">都道府縣</div>
          </div>
          <div className="glass rounded-lg p-6">
            <div className="font-display text-4xl font-bold">{wrapped.travelogueCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">篇遊記</div>
          </div>
          <div className="glass rounded-lg p-6 col-span-2 sm:col-span-1">
            <div className="font-display text-4xl font-bold">{wrapped.photoCount}</div>
            <div className="mt-1 text-sm text-muted-foreground">張照片</div>
          </div>
        </div>

        {wrapped.topAnime.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold">最常巡禮作品</h2>
            <div className="mt-4 space-y-3">
              {wrapped.topAnime.map((a, i) => (
                <Link
                  key={a.anilistId}
                  href={`/anime/${a.anilistId}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/30 hover:bg-elevated"
                >
                  <span>
                    <span className="mr-3 text-primary">#{i + 1}</span>
                    {a.title}
                  </span>
                  <span className="text-sm text-muted-foreground">{a.count} 處</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {wrapped.prefectures.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold">造訪的都道府縣</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {wrapped.prefectures.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-border bg-primary/10 px-3 py-1 text-sm text-primary"
                >
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <Link
            href={`/users/${userId}`}
            className="inline-flex rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-brand-600"
          >
            返回個人檔案
          </Link>
        </div>
      </div>
    </div>
  );
}
