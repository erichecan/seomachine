"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UsageData = {
  plan: string;
  monthly: { used: number; limit: number; period: string };
  daily: { used: number; limit: number; period: string };
};

const PLAN_INFO = {
  free: { name: "免费版", price: "$0", color: "secondary" as const },
  basic: { name: "Basic", price: "$29/月", color: "default" as const },
  pro: { name: "Pro", price: "$79/月", color: "default" as const },
  team: { name: "Team", price: "$199/月", color: "default" as const },
};

const UPGRADE_PLANS = [
  {
    key: "basic",
    name: "Basic",
    price: "$29",
    features: ["每月 150 篇", "每天 5 篇", "DeepSeek V3", "WordPress/Webhook 发布"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$79",
    features: ["每月 600 篇", "每天 20 篇", "GPT-4o 高质量", "全渠道发布", "品牌音色"],
    highlight: true,
  },
  {
    key: "team",
    name: "Team",
    price: "$199",
    features: ["每月 9999 篇", "每天 200 篇", "全部 Pro 功能", "API 访问"],
  },
];

export default function BillingPage() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const currentPlan = ((session?.user as { plan?: string })?.plan ?? "free") as keyof typeof PLAN_INFO;

  useEffect(() => {
    fetchUsage();
  }, []);

  async function fetchUsage() {
    setLoading(true);
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(plan: string) {
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "无法创建结账链接");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("跳转失败，请重试");
    } finally {
      setCheckingOut(null);
    }
  }

  async function handlePortal() {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "无法打开订阅管理");
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      toast.error("跳转失败");
    } finally {
      setLoadingPortal(false);
    }
  }

  const planInfo = PLAN_INFO[currentPlan] ?? PLAN_INFO.free;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold text-zinc-900">订阅管理</h1>

        {/* Current Plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">当前方案</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-zinc-900">{planInfo.name}</span>
                    <Badge variant={planInfo.color}>{planInfo.price}</Badge>
                  </div>
                  {!loading && usage && (
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-zinc-500">本月用量</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {usage.monthly.used} / {usage.monthly.limit} 篇
                        </p>
                        <div className="mt-1 h-1.5 w-40 rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{
                              width: `${Math.min(100, (usage.monthly.used / usage.monthly.limit) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">今日用量</p>
                        <p className="text-sm font-medium text-zinc-900">
                          {usage.daily.used} / {usage.daily.limit} 篇
                        </p>
                        <div className="mt-1 h-1.5 w-40 rounded-full bg-zinc-100">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{
                              width: `${Math.min(100, (usage.daily.used / usage.daily.limit) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {currentPlan !== "free" && (
                <Button variant="outline" onClick={handlePortal} disabled={loadingPortal}>
                  {loadingPortal ? "加载中…" : "管理订阅"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Plans */}
        {currentPlan !== "team" && (
          <>
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">升级方案</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {UPGRADE_PLANS.filter((p) => p.key !== currentPlan).map((plan) => (
                <Card
                  key={plan.key}
                  className={`relative flex flex-col border-2 ${
                    plan.highlight ? "border-blue-600 shadow-md" : "border-zinc-200"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white text-xs">最受欢迎</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-zinc-900">{plan.price}</span>
                      <span className="text-sm text-zinc-500">/月</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <ul className="flex-1 space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-zinc-700">
                          <span className="text-blue-500">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={checkingOut === plan.key}
                    >
                      {checkingOut === plan.key ? "跳转中…" : `升级到 ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-zinc-500">
              通过 Lemon Squeezy 安全付款 · 随时取消 · 自动处理 VAT/增值税
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
