"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "概览" },
  { href: "/write", label: "写文章" },
  { href: "/articles", label: "文章库" },
  { href: "/channels", label: "发布渠道" },
  { href: "/settings", label: "品牌设置" },
  { href: "/billing", label: "订阅" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-bold text-zinc-900">
              SEO Machine
            </Link>
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-100 text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {session?.user && (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {(session.user as { plan?: string }).plan ?? "free"}
              </Badge>
            )}
            <span className="hidden text-sm text-zinc-600 sm:block">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              退出
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-zinc-50">{children}</main>
    </div>
  );
}
