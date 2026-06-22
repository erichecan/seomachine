"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OutlineSection = { heading: string; points: string[] };
type Outline = { title: string; sections: OutlineSection[] };

const LANGUAGES = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
];

export default function WritePage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState("zh");
  const [instructions, setInstructions] = useState("");
  const [outline, setOutline] = useState<Outline | null>(null);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingArticle, setGeneratingArticle] = useState(false);

  async function handleGenerateOutline() {
    if (!keyword.trim()) {
      toast.error("请输入目标关键词");
      return;
    }
    setGeneratingOutline(true);
    setOutline(null);
    try {
      const res = await fetch("/api/generate/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, language, instructions }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "生成大纲失败");
        return;
      }
      setOutline(data.outline);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setGeneratingOutline(false);
    }
  }

  async function handleGenerateArticle() {
    if (!outline) return;
    setGeneratingArticle(true);

    try {
      const createRes = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: outline.title,
          targetKeyword: keyword,
          language,
          status: "draft",
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        toast.error(createData.error ?? "创建文章失败");
        return;
      }
      const articleId = createData.article.id;

      const sseRes = await fetch("/api/generate/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          outline,
          language,
          instructions,
          articleId,
        }),
      });

      if (!sseRes.ok) {
        const errData = await sseRes.json().catch(() => ({}));
        toast.error((errData as { error?: string }).error ?? "生成文章失败");
        return;
      }

      router.push(`/editor/${articleId}?generating=1`);
    } catch {
      toast.error("启动生成失败，请重试");
      setGeneratingArticle(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold text-zinc-900">写新文章</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">第一步：设置文章参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyword">目标关键词 *</Label>
              <Input
                id="keyword"
                placeholder="例如：如何提高网站 SEO 排名"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateOutline()}
              />
            </div>
            <div className="space-y-2">
              <Label>文章语言</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v ?? "zh")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">补充说明（选填）</Label>
              <Textarea
                id="instructions"
                placeholder="例如：目标读者是初学者，重点讲实操技巧，文风轻松"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleGenerateOutline}
              disabled={generatingOutline || !keyword.trim()}
              className="w-full"
            >
              {generatingOutline ? "生成大纲中…" : "生成文章大纲"}
            </Button>
          </CardContent>
        </Card>

        {outline && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">第二步：确认大纲</CardTitle>
            </CardHeader>
            <CardContent>
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">{outline.title}</h2>
              <ol className="space-y-4">
                {outline.sections.map((section, i) => (
                  <li key={i}>
                    <p className="font-medium text-zinc-800">
                      {i + 1}. {section.heading}
                    </p>
                    {section.points?.length > 0 && (
                      <ul className="ml-4 mt-1 list-disc space-y-0.5 text-sm text-zinc-600">
                        {section.points.map((pt, j) => (
                          <li key={j}>{pt}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleGenerateArticle}
                  disabled={generatingArticle}
                  className="flex-1"
                >
                  {generatingArticle ? "启动生成中…" : "按此大纲生成全文"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateOutline}
                  disabled={generatingOutline}
                >
                  重新生成大纲
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
