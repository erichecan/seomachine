import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Plan } from "@prisma/client";

const PLAN_LIMITS: Record<Plan, { daily: number; monthly: number; wordLimit: number }> = {
  free: { daily: 2, monthly: 5, wordLimit: 500 },
  basic: { daily: 5, monthly: 150, wordLimit: 1500 },
  pro: { daily: 20, monthly: 600, wordLimit: 3000 },
  team: { daily: 200, monthly: 9999, wordLimit: 8000 },
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const userId = session.user.id;
    const plan = ((session.user as { plan?: string }).plan ?? "free") as Plan;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const today = now.toISOString().slice(0, 10);

    const [monthly, daily] = await Promise.all([
      prisma.usageRecord.findUnique({ where: { userId_period: { userId, period } } }),
      prisma.usageRecord.findFirst({ where: { userId, period: today } }),
    ]);

    const limits = PLAN_LIMITS[plan];

    return Response.json({
      plan,
      period,
      monthly: {
        used: monthly?.articlesCount ?? 0,
        limit: limits.monthly,
        tokensInput: monthly?.tokensInput ?? 0,
        tokensOutput: monthly?.tokensOutput ?? 0,
      },
      daily: {
        used: daily?.articlesCount ?? 0,
        limit: limits.daily,
      },
      wordLimit: limits.wordLimit,
    });
  } catch (error) {
    console.error("[usage GET]", error);
    return Response.json({ error: "获取用量失败" }, { status: 500 });
  }
}
