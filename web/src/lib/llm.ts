import OpenAI from "openai";
import { prisma } from "@/lib/db";
import type { Plan } from "@prisma/client";

const DAILY_LIMITS: Record<Plan, number> = {
  free: 2,
  basic: 5,
  pro: 20,
  team: 200,
};

const MONTHLY_LIMITS: Record<Plan, number> = {
  free: 5,
  basic: 150,
  pro: 600,
  team: 9999,
};

const WORD_LIMITS: Record<Plan, number> = {
  free: 500,
  basic: 1500,
  pro: 3000,
  team: 8000,
};

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

function getDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: "https://api.deepseek.com/v1",
  });
}

export type ModelSelection = {
  model: string;
  client: OpenAI;
  wordLimit: number;
};

export async function selectModel(
  userId: string,
  plan: Plan
): Promise<ModelSelection> {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.toISOString().slice(0, 10);

  const [monthly, daily] = await Promise.all([
    prisma.usageRecord.findUnique({ where: { userId_period: { userId, period } } }),
    prisma.usageRecord.findFirst({
      where: { userId, period: today },
    }),
  ]);

  const monthlyCount = monthly?.articlesCount ?? 0;
  const dailyCount = daily?.articlesCount ?? 0;

  if (dailyCount >= DAILY_LIMITS[plan]) {
    throw new Error("DAILY_LIMIT_EXCEEDED");
  }
  if (monthlyCount >= MONTHLY_LIMITS[plan]) {
    throw new Error("MONTHLY_LIMIT_EXCEEDED");
  }

  const wordLimit = WORD_LIMITS[plan];

  if (plan === "free" || plan === "basic") {
    return { model: "deepseek-chat", client: getDeepSeekClient(), wordLimit };
  }

  // pro/team: use GPT-4o, downgrade to gpt-4o-mini near soft limit
  const softLimit = Math.floor(MONTHLY_LIMITS[plan] * 0.9);
  if (monthlyCount >= softLimit) {
    return { model: "gpt-4o-mini", client: getOpenAIClient(), wordLimit };
  }
  return { model: "gpt-4o", client: getOpenAIClient(), wordLimit };
}

export async function incrementUsage(
  userId: string,
  tokensInput: number,
  tokensOutput: number
) {
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const today = now.toISOString().slice(0, 10);

  await Promise.all([
    prisma.usageRecord.upsert({
      where: { userId_period: { userId, period } },
      create: {
        userId,
        period,
        articlesCount: 1,
        tokensInput,
        tokensOutput,
      },
      update: {
        articlesCount: { increment: 1 },
        tokensInput: { increment: tokensInput },
        tokensOutput: { increment: tokensOutput },
      },
    }),
    // daily record uses YYYY-MM-DD as period key
    prisma.usageRecord.upsert({
      where: { userId_period: { userId, period: today } },
      create: {
        userId,
        period: today,
        articlesCount: 1,
        tokensInput: 0,
        tokensOutput: 0,
      },
      update: {
        articlesCount: { increment: 1 },
      },
    }),
  ]);
}
