import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLAN_LIMITS: Record<string, { daily: number; monthly: number }> = {
  free: { daily: 2, monthly: 5 },
  basic: { daily: 5, monthly: 150 },
  pro: { daily: 20, monthly: 600 },
  team: { daily: 200, monthly: 9999 },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const plan = (session.user as { plan?: string }).plan ?? "free";

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayKey = `${monthKey}-${String(now.getDate()).padStart(2, "0")}`;

  const [monthlyRecord, dailyRecord, recentArticles, totalArticles] = await Promise.all([
    prisma.usageRecord.findUnique({ where: { userId_period: { userId, period: monthKey } } }),
    prisma.usageRecord.findUnique({ where: { userId_period: { userId, period: dayKey } } }),
    prisma.article.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, seoScore: true, updatedAt: true },
    }),
    prisma.article.count({ where: { userId } }),
  ]);

  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const monthlyUsed = monthlyRecord?.articlesCount ?? 0;
  const dailyUsed = dailyRecord?.articlesCount ?? 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">概览</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {session.user.name ?? session.user.email}，欢迎回来
            </p>
          </div>
          <Link href="/write">
            <Button>写新文章</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">今日已用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">
                {dailyUsed} / {limits.daily}
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, (dailyUsed / limits.daily) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">本月已用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">
                {monthlyUsed} / {limits.monthly}
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100, (monthlyUsed / limits.monthly) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">文章总数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900">{totalArticles}</div>
              <p className="mt-1 text-xs text-zinc-500">
                <Link href="/articles" className="hover:underline">查看全部 →</Link>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-600">当前方案</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize text-zinc-900">{plan}</div>
              <p className="mt-1 text-xs text-zinc-500">
                <Link href="/billing" className="hover:underline">升级方案 →</Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">最近文章</CardTitle>
            <Link href="/articles">
              <Button variant="ghost" size="sm">查看全部</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentArticles.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                还没有文章，
                <Link href="/write" className="text-blue-600 hover:underline">立即创建第一篇</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentArticles.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/editor/${a.id}`}
                        className="truncate text-sm font-medium text-zinc-900 hover:text-blue-600"
                      >
                        {a.title}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {new Date(a.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <div className="ml-4 flex shrink-0 items-center gap-2">
                      {a.seoScore !== null && (
                        <span
                          className={`text-xs font-semibold ${
                            a.seoScore >= 70
                              ? "text-green-600"
                              : a.seoScore >= 40
                              ? "text-yellow-600"
                              : "text-red-500"
                          }`}
                        >
                          SEO {a.seoScore}
                        </span>
                      )}
                      <Badge
                        variant={a.status === "published" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {a.status === "published" ? "已发布" : a.status === "draft" ? "草稿" : "归档"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
