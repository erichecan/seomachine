"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Article = {
  id: string;
  title: string;
  content: string;
  targetKeyword: string;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  seoScore: number | null;
  wordCount: number;
  language: string;
  status: string;
  channel?: { id: string; name: string; type: string } | null;
};

type Channel = { id: string; name: string; type: string };

type SeoResult = {
  score: number;
  wordCount: number;
  keywordDensity: number;
  readability: number;
  checks: { label: string; passed: boolean; tip?: string }[];
};

function EditorContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isGenerating = searchParams.get("generating") === "1";

  const [article, setArticle] = useState<Article | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchArticle();
    fetchChannels();
  }, [id]);

  useEffect(() => {
    if (isGenerating && article) {
      startStreaming();
    }
  }, [article?.id, isGenerating]);

  async function fetchArticle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${id}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error("文章不存在");
        router.push("/articles");
        return;
      }
      const a: Article = data.article;
      setArticle(a);
      setTitle(a.title);
      setContent(a.content);
      setMetaTitle(a.metaTitle ?? "");
      setMetaDescription(a.metaDescription ?? "");
      setSlug(a.slug ?? "");
      if (a.seoScore !== null) {
        analyzeContent(a.content, a.targetKeyword, a.metaTitle, a.metaDescription);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchChannels() {
    const res = await fetch("/api/channels");
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels ?? []);
    }
  }

  async function startStreaming() {
    if (!article) return;
    setStreaming(true);
    setContent("");

    try {
      const res = await fetch("/api/generate/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: article.targetKeyword,
          language: article.language,
          articleId: article.id,
        }),
      });

      if (!res.ok || !res.body) {
        toast.error("生成失败");
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.text) {
              accumulated += payload.text;
              setContent(accumulated);
            } else if (payload.done) {
              await fetchArticle();
              toast.success("文章生成完成");
            } else if (payload.error) {
              toast.error(payload.error);
            }
          } catch {}
        }
      }
    } catch {
      toast.error("生成中断，请稍后重试");
    } finally {
      setStreaming(false);
      router.replace(`/editor/${id}`);
    }
  }

  const analyzeContent = useCallback(
    async (c: string, keyword: string, mt?: string | null, md?: string | null) => {
      if (!c.trim() || !keyword) return;
      const res = await fetch("/api/analyze/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: c, keyword, metaTitle: mt, metaDescription: md }),
      });
      if (res.ok) {
        const data = await res.json();
        setSeoResult(data.result);
      }
    },
    []
  );

  function scheduleAnalyze(c: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      analyzeContent(c, article?.targetKeyword ?? "", metaTitle, metaDescription);
      autoSave(c);
    }, 1500);
  }

  async function autoSave(c: string) {
    if (!article) return;
    await fetch(`/api/articles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: c, wordCount: c.split(/\s+/).filter(Boolean).length }),
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          slug: slug || null,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        }),
      });
      if (res.ok) {
        toast.success("已保存");
      } else {
        toast.error("保存失败");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!selectedChannel) {
      toast.error("请选择发布渠道");
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id, channelId: selectedChannel }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "发布失败");
        return;
      }
      toast.success("发布成功！");
      setShowPublishDialog(false);
      await fetchArticle();
    } finally {
      setPublishing(false);
    }
  }

  function getSeoColor(score: number) {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-500";
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
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        {/* Main Editor */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/articles")}>
                ← 返回
              </Button>
              <Badge variant="secondary">{article?.targetKeyword}</Badge>
              {streaming && (
                <Badge className="animate-pulse bg-blue-500">AI 生成中…</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </Button>
              <Button size="sm" disabled={streaming} onClick={() => setShowPublishDialog(true)}>发布</Button>
              <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>选择发布渠道</DialogTitle>
                  </DialogHeader>
                  {channels.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500">
                      还没有配置发布渠道，
                      <a href="/channels" className="text-blue-600 hover:underline">去配置</a>
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v ?? "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择渠道" />
                        </SelectTrigger>
                        <SelectContent>
                          {channels.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {ch.name} ({ch.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        className="w-full"
                        onClick={handlePublish}
                        disabled={publishing || !selectedChannel}
                      >
                        {publishing ? "发布中…" : "确认发布"}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="text-lg font-semibold"
          />

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              scheduleAnalyze(e.target.value);
            }}
            placeholder={streaming ? "AI 正在生成内容…" : "在此编辑文章内容（Markdown 格式）"}
            className="min-h-[500px] font-mono text-sm leading-relaxed"
            disabled={streaming}
          />
        </div>

        {/* SEO Sidebar */}
        <div className="w-72 shrink-0 space-y-4">
          {seoResult && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  SEO 评分
                  <span className={`text-2xl font-bold ${getSeoColor(seoResult.score)}`}>
                    {seoResult.score}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>字数：{seoResult.wordCount}</span>
                  <span>关键词密度：{seoResult.keywordDensity.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>可读性：{Math.round(seoResult.readability)}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {seoResult.checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={c.passed ? "text-green-500" : "text-red-400"}>
                        {c.passed ? "✓" : "✗"}
                      </span>
                      <span className={c.passed ? "text-zinc-700" : "text-zinc-500"}>
                        {c.label}
                        {!c.passed && c.tip && (
                          <span className="block text-zinc-400">{c.tip}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SEO Meta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Meta 标题</Label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="SEO 标题（建议 50–60 字符）"
                  className="text-xs"
                />
                <p className="text-right text-xs text-zinc-400">{metaTitle.length}/60</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Meta 描述</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="页面描述（建议 120–160 字符）"
                  className="text-xs"
                  rows={3}
                />
                <p className="text-right text-xs text-zinc-400">{metaDescription.length}/160</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-friendly-slug"
                  className="font-mono text-xs"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={async () => {
                  const res = await fetch("/api/generate/seo-meta", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      content,
                      keyword: article?.targetKeyword,
                      title,
                    }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    const m = data.meta;
                    setMetaTitle(m.metaTitle ?? "");
                    setMetaDescription(m.metaDescription ?? "");
                    setSlug(m.slug ?? "");
                    toast.success("Meta 已自动生成");
                  }
                }}
              >
                AI 生成 Meta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
