"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Channel = {
  id: string;
  name: string;
  type: "wordpress" | "shopify" | "webhook";
  status: "active" | "error";
  lastPublishedAt: string | null;
  createdAt: string;
};

type ChannelForm = {
  name: string;
  type: "wordpress" | "shopify" | "webhook";
  url: string;
  username: string;
  appPassword: string;
  secret: string;
};

const DEFAULT_FORM: ChannelForm = {
  name: "",
  type: "wordpress",
  url: "",
  username: "",
  appPassword: "",
  secret: "",
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ChannelForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    setLoading(true);
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function buildConfig(f: ChannelForm) {
    if (f.type === "wordpress") {
      return { url: f.url, username: f.username, appPassword: f.appPassword };
    }
    if (f.type === "webhook") {
      return { url: f.url, secret: f.secret };
    }
    return { url: f.url };
  }

  async function handleSave() {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("名称和 URL 不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          config: buildConfig(form),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "创建失败");
        return;
      }
      toast.success("渠道已添加");
      setOpen(false);
      setForm(DEFAULT_FORM);
      fetchChannels();
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/channels/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("连接测试成功");
      } else {
        toast.error(data.error ?? "连接测试失败");
      }
      fetchChannels();
    } finally {
      setTesting(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确认删除此渠道？")) return;
    const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("渠道已删除");
      fetchChannels();
    } else {
      toast.error("删除失败");
    }
  }

  const f = form;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900">发布渠道</h1>
          <Button onClick={() => setOpen(true)}>添加渠道</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>添加发布渠道</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>渠道名称</Label>
                  <Input
                    placeholder="我的 WordPress 博客"
                    value={f.name}
                    onChange={(e) => setForm({ ...f, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>渠道类型</Label>
                  <Select
                    value={f.type}
                    onValueChange={(v) => setForm({ ...f, type: v as ChannelForm["type"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="shopify">Shopify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>站点 URL</Label>
                  <Input
                    placeholder="https://yoursite.com"
                    value={f.url}
                    onChange={(e) => setForm({ ...f, url: e.target.value })}
                  />
                </div>
                {f.type === "wordpress" && (
                  <>
                    <div className="space-y-2">
                      <Label>用户名</Label>
                      <Input
                        placeholder="WordPress 用户名"
                        value={f.username}
                        onChange={(e) => setForm({ ...f, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>应用密码</Label>
                      <Input
                        type="password"
                        placeholder="WordPress 应用密码（非登录密码）"
                        value={f.appPassword}
                        onChange={(e) => setForm({ ...f, appPassword: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {f.type === "webhook" && (
                  <div className="space-y-2">
                    <Label>签名密钥（选填）</Label>
                    <Input
                      placeholder="用于验证 Webhook 签名"
                      value={f.secret}
                      onChange={(e) => setForm({ ...f, secret: e.target.value })}
                    />
                  </div>
                )}
                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? "保存中…" : "保存渠道"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500">加载中…</div>
        ) : channels.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-zinc-500">
              还没有发布渠道，点击"添加渠道"连接你的网站
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {channels.map((ch) => (
              <Card key={ch.id}>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{ch.name}</CardTitle>
                    <Badge variant="outline" className="text-xs capitalize">{ch.type}</Badge>
                    <Badge
                      variant={ch.status === "active" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {ch.status === "active" ? "正常" : "异常"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(ch.id)}
                      disabled={testing === ch.id}
                    >
                      {testing === ch.id ? "测试中…" : "测试连接"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(ch.id)}
                    >
                      删除
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-zinc-500">
                    创建于 {new Date(ch.createdAt).toLocaleDateString("zh-CN")}
                    {ch.lastPublishedAt && (
                      <>，最近发布 {new Date(ch.lastPublishedAt).toLocaleDateString("zh-CN")}</>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
