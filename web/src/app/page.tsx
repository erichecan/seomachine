import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "AI 文章生成",
    desc: "输入关键词，一键生成结构完整、SEO 友好的长文。支持 DeepSeek V3 和 GPT-4o 多模型路由。",
    icon: "✍️",
  },
  {
    title: "实时 SEO 评分",
    desc: "写作过程中实时分析关键词密度、标题结构、Meta 描述，给出 0–100 分评分与修改建议。",
    icon: "📊",
  },
  {
    title: "一键发布",
    desc: "连接 WordPress、Shopify 或自定义 Webhook，文章完成后直接推送到你的网站，无需复制粘贴。",
    icon: "🚀",
  },
  {
    title: "品牌音色",
    desc: "配置品牌语气、写作风格和竞品参考，AI 生成的内容始终符合你的品牌调性。",
    icon: "🎨",
  },
  {
    title: "用量仪表盘",
    desc: "清晰展示每日/每月文章配额使用情况，掌握 AI Token 消耗，合理规划内容计划。",
    icon: "📈",
  },
  {
    title: "多模型路由",
    desc: "免费版使用 DeepSeek 控制成本，Pro/Team 版自动切换 GPT-4o，兼顾质量与效率。",
    icon: "🔀",
  },
];

const plans = [
  {
    name: "Basic",
    price: "$29",
    period: "/月",
    desc: "适合个人内容创作者",
    features: ["每月 150 篇文章", "每篇最多 1500 字", "WordPress / Webhook 发布", "SEO 评分分析", "邮件支持"],
    cta: "开始使用",
    highlight: false,
    planKey: "basic",
  },
  {
    name: "Pro",
    price: "$79",
    period: "/月",
    desc: "适合专业 SEO 团队",
    features: ["每月 600 篇文章", "每篇最多 3000 字", "全渠道发布", "GPT-4o 高质量生成", "品牌音色配置", "优先支持"],
    cta: "立即升级",
    highlight: true,
    planKey: "pro",
  },
  {
    name: "Team",
    price: "$199",
    period: "/月",
    desc: "适合内容工厂与代理商",
    features: ["每月 9999 篇文章", "每篇最多 8000 字", "全部 Pro 功能", "API 访问", "专属客户经理"],
    cta: "联系我们",
    highlight: false,
    planKey: "team",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-zinc-900">
            SEO Machine
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">登录</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">免费开始</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-6 text-sm">
          AI 驱动的 SEO 内容平台
        </Badge>
        <h1 className="mx-auto mb-6 max-w-3xl text-5xl font-bold leading-tight tracking-tight text-zinc-900">
          从关键词到发布，<br />
          <span className="text-blue-600">10 分钟完成一篇 SEO 文章</span>
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-600">
          输入目标关键词，AI 自动生成大纲、撰写正文、优化 SEO，一键发布到你的 WordPress 或 Shopify。
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/register">
            <Button size="lg" className="px-8">免费开始 — 每月 5 篇</Button>
          </Link>
          <Link href="#pricing">
            <Button size="lg" variant="outline" className="px-8">查看定价</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-zinc-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900">
            一站式 SEO 内容工作流
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-zinc-200">
                <CardHeader className="pb-2">
                  <div className="mb-2 text-3xl">{f.icon}</div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-3xl font-bold text-zinc-900">简单透明的定价</h2>
          <p className="mb-12 text-center text-zinc-600">所有方案均含免费试用期，随时取消。</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col border-2 ${
                  plan.highlight ? "border-blue-600 shadow-lg" : "border-zinc-200"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">最受欢迎</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-zinc-500">{plan.desc}</p>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-zinc-900">{plan.price}</span>
                    <span className="text-zinc-500">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <ul className="flex-1 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                        <span className="mt-0.5 text-blue-500">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/register?plan=${plan.planKey}`} className="mt-auto">
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            免费版：每月 5 篇，无需信用卡。升级后立即生效。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 bg-zinc-50 py-10">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-zinc-500">
          <p className="mb-2 font-semibold text-zinc-700">SEO Machine</p>
          <p>AI 驱动的 SEO 内容平台 · 帮助你更快写出排名更高的文章</p>
        </div>
      </footer>
    </div>
  );
}
