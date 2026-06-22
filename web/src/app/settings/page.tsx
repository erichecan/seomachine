"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BrandConfig = {
  brandVoice: string | null;
  styleGuide: string | null;
  seoGuidelines: string | null;
  internalLinks: string[];
  targetKeywords: string[];
  writingExamples: string[];
  competitorSites: string[];
};

const EMPTY: BrandConfig = {
  brandVoice: "",
  styleGuide: "",
  seoGuidelines: "",
  internalLinks: [],
  targetKeywords: [],
  writingExamples: [],
  competitorSites: [],
};

export default function SettingsPage() {
  const [config, setConfig] = useState<BrandConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [internalLinksText, setInternalLinksText] = useState("");
  const [targetKeywordsText, setTargetKeywordsText] = useState("");
  const [writingExamplesText, setWritingExamplesText] = useState("");
  const [competitorSitesText, setCompetitorSitesText] = useState("");

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    try {
      const res = await fetch("/api/brand");
      if (res.ok) {
        const data = await res.json();
        const c: BrandConfig = data.config ?? EMPTY;
        setConfig(c);
        setInternalLinksText((c.internalLinks ?? []).join("\n"));
        setTargetKeywordsText((c.targetKeywords ?? []).join(", "));
        setWritingExamplesText((c.writingExamples ?? []).join("\n"));
        setCompetitorSitesText((c.competitorSites ?? []).join("\n"));
      }
    } finally {
      setLoading(false);
    }
  }

  function parseLines(text: string) {
    return text.split("\n").map((s) => s.trim()).filter(Boolean);
  }

  function parseComma(text: string) {
    return text.split(",").map((s) => s.trim()).filter(Boolean);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandVoice: config.brandVoice || null,
          styleGuide: config.styleGuide || null,
          seoGuidelines: config.seoGuidelines || null,
          internalLinks: parseLines(internalLinksText),
          targetKeywords: parseComma(targetKeywordsText),
          writingExamples: parseLines(writingExamplesText),
          competitorSites: parseLines(competitorSitesText),
        }),
      });
      if (res.ok) {
        toast.success("品牌设置已保存");
      } else {
        toast.error("保存失败");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-zinc-500">加载中…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">品牌设置</h1>
            <p className="mt-1 text-sm text-zinc-600">配置后，AI 生成内容将自动符合你的品牌风格</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : "保存设置"}
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">品牌语气</CardTitle>
              <CardDescription>描述你品牌的写作风格和语气特点</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="例如：专业但不生硬，使用简洁直接的表达，避免行话，适合非技术读者阅读"
                value={config.brandVoice ?? ""}
                onChange={(e) => setConfig({ ...config, brandVoice: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">风格指南</CardTitle>
              <CardDescription>具体的写作规范，如排版、用词偏好等</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="例如：数字使用阿拉伯数字、段落不超过 3 句话、标题使用疑问句式…"
                value={config.styleGuide ?? ""}
                onChange={(e) => setConfig({ ...config, styleGuide: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO 规范</CardTitle>
              <CardDescription>关键词使用规则、内链策略等 SEO 特定要求</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="例如：每篇文章目标关键词密度 1-2%，首段必须包含关键词，H2 标题使用长尾关键词变体…"
                value={config.seoGuidelines ?? ""}
                onChange={(e) => setConfig({ ...config, seoGuidelines: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">目标关键词</CardTitle>
              <CardDescription>品牌核心关键词，用逗号分隔</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="SEO 优化, 内容营销, 搜索引擎排名"
                value={targetKeywordsText}
                onChange={(e) => setTargetKeywordsText(e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">内链列表</CardTitle>
              <CardDescription>每行一个 URL，AI 生成时会优先引用这些链接</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="https://yoursite.com/about&#10;https://yoursite.com/services"
                value={internalLinksText}
                onChange={(e) => setInternalLinksText(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">写作示例</CardTitle>
              <CardDescription>每行一个示例文章 URL，AI 会学习你的写作风格</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="https://yoursite.com/blog/example-post-1&#10;https://yoursite.com/blog/example-post-2"
                value={writingExamplesText}
                onChange={(e) => setWritingExamplesText(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">竞品网站</CardTitle>
              <CardDescription>每行一个 URL，用于了解竞品内容策略</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="https://competitor1.com&#10;https://competitor2.com"
                value={competitorSitesText}
                onChange={(e) => setCompetitorSitesText(e.target.value)}
                rows={3}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中…" : "保存所有设置"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
