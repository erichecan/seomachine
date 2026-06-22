# SEO Machine — 开发计划

> 生成日期：2026-06-22  
> 范围：Phase 1（Core SEO Engine）+ Phase 2（SaaS 后端）+ Phase 3（Web 前端）

---

## 一、读取的产品文档

| 文档 | 路径 | 内容 |
|------|------|------|
| PRD | `docs/20260622-prd.md` | 功能需求、数据模型、API 清单、技术栈 |
| 技术架构 | `docs/20260622-tech-architecture.md` | 系统架构图、Redis 设计、连接器接口规范 |
| 产品设计 | `docs/20260622-saas-product-design.md` | 商业模式、定价、成本控制策略 |
| 决策记录 | `docs/20260622-decisions-log.md` | 9 项关键决策及理由 |

---

## 二、架构说明

### 现有代码处理方式

当前仓库根目录是一个 **Vite + Tauri 桌面应用**（`src/`、`src-tauri/`），已决策废弃桌面方向。

**处置方案**：在仓库根目录新建 `web/` 子目录，放置 Next.js SaaS 应用，与旧桌面代码并存但独立运行。

```
seomachine/
├── web/                  ← 新建，Next.js SaaS 应用（本次开发目标）
│   ├── src/
│   ├── prisma/
│   ├── .env.local
│   └── package.json
├── src/                  ← 旧 Tauri 桌面 App（保留不动）
├── src-tauri/            ← 旧 Tauri 桌面 App（保留不动）
├── data_sources/         ← Python SEO 分析模块（后续复用）
└── docs/                 ← 产品文档
```

---

## 三、技术栈（已确认）

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Next.js 15 App Router | 全栈（前端 + API Routes） |
| 语言 | TypeScript 5.x | 严格模式 |
| 样式 | TailwindCSS 4.x | |
| 组件库 | shadcn/ui + Radix UI | |
| 编辑器 | TipTap 2.x | 富文本，支持 Markdown 快捷键 |
| 状态管理 | Zustand 5.x | 轻量级客户端状态 |
| ORM | Prisma 5.x | 类型安全数据库访问 |
| 数据库 | Neon PostgreSQL（Serverless） | 同时承担用量计数，替代 Redis |
| ~~缓存/用量~~ | ~~Upstash Redis~~ | ❌ 跳过，Neon 直接记录用量 |
| 认证 | NextAuth.js v5（next-auth） | 邮箱登录先行，Google OAuth 后加 |
| 计费 | **Lemon Squeezy** | Checkout + Webhook + Customer Portal |
| ~~邮件~~ | ~~Resend~~ | ❌ MVP 暂跳过 |
| 部署 | **GCP Cloud Run** | Docker 容器，GitHub Actions 自动部署 |
| 监控 | Sentry | 免费套餐 |
| LLM | OpenAI SDK（兼容 DeepSeek）+ Anthropic SDK | |

---

## 四、数据库 Schema

```prisma
// prisma/schema.prisma

model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String?
  avatarUrl        String?
  passwordHash     String?
  emailVerified    Boolean   @default(false)
  plan             String    @default("free")  // free/basic/pro/team
  planExpiresAt    DateTime?
  stripeCustomerId String?   @unique
  freeArticlesUsed Int       @default(0)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  articles      Article[]
  channels      Channel[]
  usageRecords  UsageRecord[]
  brandConfig   BrandConfig?
}

model Article {
  id                  String    @id @default(cuid())
  userId              String
  title               String
  content             String?   // Markdown
  contentHtml         String?   // 发布时转换的 HTML
  targetKeyword       String?
  metaTitle           String?
  metaDescription     String?
  slug                String?
  seoScore            Int?
  wordCount           Int?
  language            String    @default("zh")
  status              String    @default("draft")  // draft/published/archived
  publishedAt         DateTime?
  publishedChannelId  String?
  externalPostId      String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel Channel? @relation(fields: [publishedChannelId], references: [id], onDelete: SetNull)
}

model Channel {
  id              String    @id @default(cuid())
  userId          String
  name            String
  type            String    // wordpress/shopify/webhook
  configEncrypted String    // AES-256-GCM 加密的 JSON
  status          String    @default("active")  // active/error
  lastTestedAt    DateTime?
  createdAt       DateTime  @default(now())

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  articles Article[]
}

model UsageRecord {
  id            String   @id @default(cuid())
  userId        String
  period        String   // YYYY-MM
  articlesCount Int      @default(0)
  tokensInput   Int      @default(0)
  tokensOutput  Int      @default(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, period])
}

model BrandConfig {
  userId           String   @id
  brandVoice       String?
  styleGuide       String?
  seoGuidelines    String?
  internalLinks    Json     @default("[]")
  targetKeywords   Json     @default("[]")
  writingExamples  Json     @default("[]")
  competitorSites  Json     @default("[]")
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model StripeEvent {
  id        String   @id  // Stripe Event ID
  type      String
  processed Boolean  @default(false)
  payload   Json
  createdAt DateTime @default(now())
}
```

---

## 五、页面路由清单

| 页面 | 路由 | 认证要求 |
|------|------|---------|
| 落地页 | `/` | 公开 |
| 定价页 | `/pricing` | 公开 |
| 登录 | `/auth/login` | 公开 |
| 注册 | `/auth/register` | 公开 |
| 密码重置 | `/auth/reset-password` | 公开 |
| Onboarding | `/onboarding` | 需登录 |
| 仪表盘 | `/dashboard` | 需登录 |
| 新建文章 | `/write` | 需登录 |
| 文章编辑器 | `/editor/[id]` | 需登录 |
| 文章列表 | `/articles` | 需登录 |
| 发布渠道 | `/channels` | 需登录 |
| 品牌设置 | `/settings/brand` | 需登录 |
| 账户设置 | `/settings/account` | 需登录 |
| 订阅管理 | `/settings/billing` | 需登录 |
| Shopify OAuth 回调 | `/api/channels/shopify/callback` | 公开（验签） |
| Stripe Webhook | `/api/billing/webhook` | 公开（验签） |

---

## 六、API 路由清单

```
认证
POST /api/auth/register              邮箱注册
POST /api/auth/login                 邮箱登录
GET  /api/auth/[...nextauth]         NextAuth 端点
POST /api/auth/forgot-password       发送重置邮件
POST /api/auth/reset-password        重置密码

文章
GET    /api/articles                 列表（支持 status 筛选、title 搜索）
POST   /api/articles                 创建
GET    /api/articles/[id]            详情
PATCH  /api/articles/[id]            更新
DELETE /api/articles/[id]            删除（软删除）

AI 生成（均需 Fair Use 中间件）
POST /api/generate/outline           生成大纲（非流式）
POST /api/generate/article           生成全文（SSE 流式）
POST /api/generate/seo-meta          生成 Meta Title/Desc/Slug
POST /api/analyze/seo                SEO 分析

渠道管理
GET    /api/channels                 列表
POST   /api/channels                 新增
PATCH  /api/channels/[id]            更新
DELETE /api/channels/[id]            删除
POST   /api/channels/[id]/test       测试连通性
GET    /api/channels/shopify/auth    启动 Shopify OAuth
GET    /api/channels/shopify/callback  OAuth 回调

发布
POST /api/publish                    发布到渠道

计费
POST /api/billing/checkout           创建 Stripe Checkout Session
POST /api/billing/portal             创建 Customer Portal Session
POST /api/billing/webhook            Stripe Webhook（公开）
GET  /api/billing/subscription       当前订阅状态

用量
GET /api/usage/current               当月 + 今日用量
GET /api/usage/history               历史 6 个月

品牌配置
GET   /api/brand                     获取
PATCH /api/brand                     更新

健康检查
GET /api/health                      {"status":"ok","db":"ok","redis":"ok"}
```

---

## 七、开发顺序（按依赖关系排列）

### 第 1 批：基础设施（无依赖）
1. `web/` 目录初始化（Next.js + shadcn/ui）
2. Prisma schema + 数据库迁移（Neon）
3. NextAuth.js v5 配置（邮箱 + Google）
4. 环境变量配置（`.env.local` 模板）
5. 健康检查 API（`/api/health`）

### 第 2 批：AI 核心（依赖基础设施）
6. LLM 多模型路由服务（`src/lib/llm.ts`）
   - DeepSeek V3（通过 OpenAI 兼容接口）
   - GPT-4o / GPT-4o mini
   - 基于套餐的模型选择逻辑
7. 大纲生成 API（`/api/generate/outline`）
8. 全文生成 API，SSE 流式（`/api/generate/article`）
9. SEO 元数据生成（`/api/generate/seo-meta`）

### 第 3 批：SEO 分析（可并行于第 2 批）
10. TypeScript SEO 分析引擎（`src/lib/seo-analyzer.ts`）
    - 综合评分算法（0-100）
    - 关键词密度计算
    - Flesch Reading Ease 可读性
    - Meta 字符数检查
    - H1/H2/H3 层级分析
11. SEO 分析 API（`/api/analyze/seo`）

### 第 4 批：Fair Use 中间件（依赖 LLM + Redis）
12. Upstash Redis 连接（`src/lib/redis.ts`）
13. 用量追踪工具（`src/lib/usage.ts`）
14. Fair Use 中间件（`src/middleware/fair-use.ts`）
    - 日限速检查
    - 月度用量累计
    - 模型选择降级逻辑
    - 免费试用（3 篇）检查
15. 用量查询 API（`/api/usage/*`）

### 第 5 批：发布连接器（相互独立）
16. WordPress 连接器（`src/lib/publishers/wordpress.ts`）
17. Shopify 连接器（`src/lib/publishers/shopify.ts`，含 OAuth 流程）
18. Webhook 连接器（`src/lib/publishers/webhook.ts`）
19. 连接器加密工具（AES-256-GCM，`src/lib/encryption.ts`）
20. 渠道管理 API（`/api/channels/*`）
21. 发布 API（`/api/publish`）

### 第 6 批：计费（依赖 NextAuth）
22. Stripe 产品/价格配置（Stripe Dashboard 手动操作）
23. Checkout API（`/api/billing/checkout`）
24. Stripe Webhook 处理（`/api/billing/webhook`）
25. Customer Portal API（`/api/billing/portal`）

### 第 7 批：邮件（依赖认证）
26. Resend 配置（`src/lib/email.ts`）
27. 注册验证邮件模板
28. 用量预警邮件（80% 触发）

### 第 8 批：文章 CRUD + 品牌配置（依赖 Prisma）
29. 文章 API（`/api/articles/*`）
30. 品牌配置 API（`/api/brand`）

### 第 9 批：前端页面
31. 落地页 `/` + 定价页 `/pricing`
32. 登录/注册/密码重置页面
33. Onboarding 流程（5 步）
34. 仪表盘 `/dashboard`
35. 写作流程页面 `/write`（关键词输入 → 大纲确认 → 流式生成）
36. 文章编辑器 `/editor/[id]`（TipTap + SEO 面板）
37. 文章列表 `/articles`
38. 发布渠道管理页面 `/channels`
39. 品牌设置 `/settings/brand`
40. 账户设置 + 订阅管理 `/settings/*`

---

## 八、环境变量清单

开发前需准备以下账号/密钥：

```bash
# 数据库
DATABASE_URL=postgresql://...neon.tech/seomachine?sslmode=require

# Redis
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# 认证
NEXTAUTH_SECRET=<随机生成>
NEXTAUTH_URL=http://localhost:3000
# GOOGLE_CLIENT_ID=...        ← 后加
# GOOGLE_CLIENT_SECRET=...    ← 后加

# LLM
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...

# 计费（Lemon Squeezy）
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_VARIANT_BASIC=...    # Basic $29/月 的 Variant ID
LEMONSQUEEZY_VARIANT_PRO=...      # Pro $79/月
LEMONSQUEEZY_VARIANT_TEAM=...     # Team $199/月

# 渠道加密
CHANNEL_ENCRYPTION_KEY=<用 openssl rand -hex 16 生成>

NEXT_PUBLIC_APP_URL=http://localhost:3000

# 监控（可选）
SENTRY_DSN=...
```

---

## 九、预计风险点

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Shopify Partner App 需提前注册 | 阻塞 Shopify 连接器开发 | MVP 先实现 WordPress + Webhook，Shopify 作为后续 |
| SSE 流式输出在 GCP Cloud Run 需确认超时配置 | 影响全文生成体验 | Cloud Run 默认 60s 超时需调整为 300s |
| Neon 冷启动延迟 | 首次请求慢 | 使用 `@neondatabase/serverless` 连接池适配 serverless |
| TipTap 编辑器 SEO 面板实时性 | debounce 500ms | API 端分析轻量，TypeScript 实现无需 Python |
| Lemon Squeezy Webhook 本地测试 | 开发不便 | 使用 ngrok 转发，或先跳过 Webhook 用手动同步 |
| DeepSeek API 在中国大陆访问 | 开发时不稳定 | 用 VPN 开发；GCP 部署在美国区，访问 DeepSeek 无障碍 |

---

## 十、MVP 范围确认

以下功能 **纳入 MVP**：
- ✅ 邮箱 + Google 登录
- ✅ AI 文章生成（大纲 + 全文流式）
- ✅ SEO 分析（TypeScript 实现）
- ✅ WordPress + Webhook 发布
- ✅ Fair Use 中间件（限速 + 降级）
- ✅ Lemon Squeezy 订阅（3 档）
- ✅ 免费试用（3 篇）
- ✅ 落地页 + 定价页

以下功能 **暂不纳入 MVP**（Phase 4）：
- ❌ Shopify 连接器（需要 Partner App 注册，可后加）
- ❌ DataForSEO 关键词研究
- ❌ GA4 / GSC 流量集成
- ❌ 内容日历
- ❌ 版本历史
- ❌ 年付折扣
