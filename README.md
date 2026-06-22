# SEO Machine

**AI 驱动的 SEO 内容 SaaS 平台**

关键词研究 · AI 写作 · 多平台发布 · 用量管理

---

## 产品定位

SEO Machine 是一个面向内容运营、独立站站长、SEO 从业者和电商卖家的 AI 内容创作 SaaS。

用户通过 Web 完成完整的 SEO 内容工作流：关键词研究 → AI 写作 → 内容优化 → 一键发布。

> 桌面 App 版本已于 2026-06-22 放弃，专注 SaaS Web 形态。

---

## 核心能力

| 能力模块 | 描述 |
|---------|------|
| 关键词研究 | DataForSEO 数据：搜索量、竞争度、SERP 分析、话题聚类 |
| AI 内容写作 | 多模型路由（DeepSeek / GPT-4o mini / GPT-4o），按套餐分配 |
| SEO 分析 | 可读性评分、关键词密度、竞品内容对比、0-100 质量评分 |
| 多平台发布 | WordPress REST API、Shopify OAuth、自定义 Webhook |
| 用量管理 | Redis 计数器、按套餐限速、Fair Use 静默执行 |
| GA4 / GSC 集成 | 流量分析、排名追踪、内容优化建议 |

---

## 定价方案

| 套餐 | 价格 | 每日限额 | 每篇字数 | 模型 |
|------|------|---------|---------|------|
| 基础版 | $29/月 | 5 篇 | 1500 字 | 超量降级 DeepSeek |
| 专业版 | $79/月 | 20 篇 | 3000 字 | GPT-4o 全程 |
| 团队版 | $199/月 | 无硬限制 | 无限制 | GPT-4o 全程 |

---

## 开发路线图

详见 [`docs/20260622-product-roadmap.html`](docs/20260622-product-roadmap.html)（可视化 HTML）

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 仓库整合、工作区搭建、产品文档 | ✅ 完成 |
| Phase 1 | 核心 SEO 引擎（LLM 路由、分析、发布连接器） | 待开发 |
| Phase 2 | SaaS 后端（认证、Stripe、Redis 用量追踪） | 待开发 |
| Phase 3 | Web 前端（研究页、写作页、编辑器、管理） | 待开发 |
| Phase 4 | 深度 SEO 研究（GA4/GSC、聚类、竞品分析） | 待开发 |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [`docs/20260622-product-roadmap.html`](docs/20260622-product-roadmap.html) | 可视化产品路线图（推荐阅读） |
| [`docs/20260622-saas-product-design.md`](docs/20260622-saas-product-design.md) | SaaS 产品设计：定价、成本控制、架构 |
| [`docs/20260622-decisions-log.md`](docs/20260622-decisions-log.md) | 所有关键决策记录及理由 |
| [`docs/20260622-tech-architecture.md`](docs/20260622-tech-architecture.md) | 技术架构详解 |
| [`docs/workspace/`](docs/workspace/) | Claude Code 工作区文档（内容研究/写作工作流） |

---

## 当前仓库结构

```
seomachine/
├── src/                    # 原桌面 App 前端（React + Tauri，待重构为 Web）
├── src-tauri/              # 原 Tauri Rust 后端（Phase 1 后废弃）
├── python-scripts/         # SEO 研究 Python 脚本（复用到 SaaS 后端）
├── data_sources/           # 数据源模块（GA4、GSC、DataForSEO、分析器）
│   └── modules/            # keyword_analyzer、readability_scorer、seo_quality_rater 等
├── context/                # 品牌声音、SEO 规范、竞品分析等配置文件
├── .claude/
│   ├── commands/           # 24 个 SEO 工作流 slash commands
│   ├── agents/             # 11 个 AI 专项 agent
│   └── skills/             # 26 个营销技能
├── topics/                 # 选题库
├── research/               # 研究简报
├── drafts/                 # 文章草稿
├── published/              # 已发布
├── rewrites/               # 改写版本
└── docs/                   # 产品文档
    └── workspace/          # Claude Code 工作区使用文档
```

---

## Claude Code 工作区（当前可用）

在 SaaS Web 上线之前，完整的 SEO 内容工作流可通过 Claude Code 直接使用。

API 凭证配置：`data_sources/config/.env`

### 常用命令

```
/research [topic]      关键词/竞品研究 → 输出到 research/
/write [topic]         AI 写作全流程 → 输出到 drafts/
/rewrite [topic]       更新现有内容 → 输出到 rewrites/
/optimize [file]       SEO 最终优化
/publish-draft [file]  发布到 WordPress
/cluster [topic]       话题聚类策略
/priorities            内容优先级矩阵
```

详细文档见 [`docs/workspace/`](docs/workspace/)

---

## 技术栈（规划）

| 层级 | 技术选型（待 Phase 1 确认） |
|------|---------------------------|
| Web 前端 | Next.js App Router + TailwindCSS + shadcn/ui |
| 后端 API | Next.js API Routes 或独立 Node.js 服务 |
| 数据库 | PostgreSQL（Supabase 或自托管） |
| 缓存/用量 | Redis |
| 计费 | Stripe |
| LLM | DeepSeek / GPT-4o mini / GPT-4o（多模型路由） |
| SEO 数据 | DataForSEO API |
| 发布连接器 | WordPress REST API、Shopify Admin API、Webhook |
