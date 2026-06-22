"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Article = {
  id: string;
  title: string;
  targetKeyword: string;
  status: string;
  seoScore: number | null;
  wordCount: number;
  language: string;
  updatedAt: string;
  channel: { id: string; name: string; type: string } | null;
};

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "归档" },
];

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (keyword) params.set("keyword", keyword);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      if (res.ok) {
        setArticles(data.articles);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleDelete(id: string) {
    if (!confirm("确认删除这篇文章？此操作不可撤销。")) return;
    const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("文章已删除");
      fetchArticles();
    } else {
      toast.error("删除失败");
    }
  }

  function statusLabel(s: string) {
    return s === "published" ? "已发布" : s === "draft" ? "草稿" : "归档";
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">文章库</h1>
          <Link href="/write">
            <Button>写新文章</Button>
          </Link>
        </div>

        <div className="mb-4 flex gap-3">
          <Input
            placeholder="搜索标题或关键词…"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500">加载中…</div>
        ) : articles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              没有找到文章，
              <Link href="/write" className="text-blue-600 hover:underline">去写第一篇</Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-3 text-left font-medium text-zinc-700">标题</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-700 sm:table-cell">关键词</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-700">SEO</th>
                    <th className="hidden px-4 py-3 text-center font-medium text-zinc-700 md:table-cell">字数</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-700">状态</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-zinc-700 lg:table-cell">更新时间</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {articles.map((a) => (
                    <tr key={a.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/editor/${a.id}`}
                          className="font-medium text-zinc-900 hover:text-blue-600"
                        >
                          {a.title}
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-600 sm:table-cell">
                        {a.targetKeyword}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.seoScore !== null ? (
                          <span
                            className={`font-semibold ${
                              a.seoScore >= 70
                                ? "text-green-600"
                                : a.seoScore >= 40
                                ? "text-yellow-600"
                                : "text-red-500"
                            }`}
                          >
                            {a.seoScore}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 text-center text-zinc-600 md:table-cell">
                        {a.wordCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={a.status === "published" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {statusLabel(a.status)}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-zinc-500 lg:table-cell">
                        {new Date(a.updatedAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => router.push(`/editor/${a.id}`)}
                          >
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(a.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-zinc-600">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
