# SEO Machine 技术架构

> 记录日期：2026-06-22  
> 阶段：Phase 1 规划前（架构待最终确认）

---

## 一、系统全景图

```
┌─────────────────────────────────────────────────────────────────┐
│                      用 户 浏 览 器                               │
│                                                                   │
│   关键词研究  │  AI 写作  │  编辑器  │  发布管理  │  用量/计费    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    SaaS Web 前端                                   │
│              Next.js App Router + TailwindCSS                     │
│              shadcn/ui + Zustand（状态管理）                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST / Server Actions
┌────────────────────────────▼────────────────────────────────────┐
│                    SaaS 后端 API                                   │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Auth    │  │  Billing │  │ Fair Use │  │  LLM Proxy   │   │
│  │  JWT/    │  │  Stripe  │  │  Redis   │  │  多模型路由   │   │
│  │  OAuth   │  │  Webhook │  │  中间件  │  │  DeepSeek/   │   │
│  └──────────┘  └──────────┘  └──────────┘  │  GPT-4o      │   │
│                                              └──────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Core SEO Engine                         │   │
│  │  keyword_analyzer │ readability_scorer │ seo_quality_rater│  │
│  │  content_length_comparator │ search_intent_analyzer       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────┬──────────┬───────────┬──────────────┬────────────────────┘
      │          │           │              │
┌─────▼──┐  ┌───▼───┐  ┌────▼───┐  ┌──────▼──────────────────┐
│PostgreSQL│ │ Redis │  │Stripe  │  │   外部 API               │
│（主数据库）│ │（用量）│  │（计费）│  │ DataForSEO / GA4 / GSC  │
└─────────┘  └───────┘  └────────┘  └─────────────────────────┘
                                              │ 发布连接器
                          ┌───────────────────┼──────────────────┐
                    ┌─────▼──────┐  ┌─────────▼────┐  ┌────────▼───┐
                    │ WordPress  │  │   Shopify     │  │  Webhook   │
                    │ REST API   │  │  Admin API    │  │  自定义站点  │
                    └────────────┘  └──────────────┘  └────────────┘
```

---

## 二、各层职责

### 2.1 Web 前端

| 模块 | 功能 |
|------|------|
| 关键词研究页 | 输入关键词，展示搜索量/竞争度/SERP/话题聚类 |
| AI 写作页 | 选择关键词 Brief → 触发 AI 生成 → 实时流式展示 |
| 内容编辑器 | Markdown 编辑，SEO 评分面板，建议侧边栏 |
| 文章管理 | 草稿/已发布/已归档列表，支持筛选搜索 |
| 发布渠道管理 | 配置 WordPress/Shopify/Webhook 连接，测试连通性 |
| 品牌设置 | 品牌声音、写作风格、目标关键词配置 |
| 用量仪表盘 | 当月已用/剩余篇数，Token 消耗趋势 |
| 订阅管理 | 当前套餐，升级/降级，账单历史（Stripe Customer Portal） |
| 用户引导 | Onboarding 流程：配置品牌 → 绑定渠道 → 生成第一篇 |

### 2.2 后端 API

| 模块 | 职责 |
|------|------|
| 认证层 | JWT 登录/刷新，OAuth（Google 快速登录） |
| Fair Use 中间件 | 每个生成请求前检查 Redis 用量计数，决定放行/限速/降级 |
| LLM Proxy | 统一入口调用多家 LLM，选型逻辑封装在此，API Key 绝不下发客户端 |
| 发布连接器 | 封装 WordPress/Shopify/Webhook 调用，处理授权和重试 |
| Stripe Webhook | 接收支付成功/取消/失败事件，同步用户套餐状态 |
| 内容缓存 | 相同关键词缓存 LLM 输出，命中率高的大词节省大量成本 |

### 2.3 Core SEO Engine（Python，复用现有代码）

现有 `data_sources/modules/` 下的分析模块直接复用：

| 模块 | 功能 |
|------|------|
| `keyword_analyzer.py` | 关键词密度、分布、堆砌检测 |
| `readability_scorer.py` | Flesch Reading Ease、年级水平 |
| `seo_quality_rater.py` | 综合 0-100 SEO 评分 |
| `content_length_comparator.py` | 与 TOP10 SERP 结果对比字数 |
| `search_intent_analyzer.py` | 查询意图分类（信息型/商业型/导航型） |
| `google_analytics.py` | GA4 流量数据 |
| `google_search_console.py` | GSC 排名/点击数据 |
| `dataforseo.py` | 关键词搜索量、竞争度、SERP 数据 |
| `wordpress_publisher.py` | WordPress 发布，支持 Yoast SEO 元数据 |
| `opportunity_scorer.py` | 内容机会评分 |

这些 Python 模块可以：
- 作为微服务独立部署（Python FastAPI）
- 或者通过 Node.js 子进程调用（参考原 Tauri Rust 命令调用方式）

---

## 三、数据模型（草稿）

### 用户 / 租户

```
User
  id, email, name, avatar
  plan: "basic" | "pro" | "team"
  plan_expires_at: Date
  stripe_customer_id: string
  created_at: Date

UsageRecord
  user_id
  period: "YYYY-MM"   // 月度计数
  articles_generated: number
  tokens_consumed: number
  updated_at: Date
```

### 内容

```
Article
  id, user_id
  title, content (Markdown)
  target_keyword
  seo_score: number
  status: "draft" | "published" | "archived"
  published_at: Date
  published_channel: "wordpress" | "shopify" | "webhook"
  external_id: string  // 目标平台的文章 ID

ResearchBrief
  id, user_id
  keyword
  search_volume, competition
  serp_data: JSON
  created_at: Date
```

### 发布渠道

```
PublishChannel
  id, user_id
  type: "wordpress" | "shopify" | "webhook"
  name: string        // 用户自取名称
  config: JSON        // 加密存储：URL、API Key、Access Token 等
  status: "active" | "error"
  last_tested_at: Date
```

### 品牌配置

```
BrandConfig
  user_id (1:1)
  brand_voice: text
  style_guide: text
  seo_guidelines: text
  internal_links: JSON
  target_keywords: JSON[]
```

---

## 四、LLM 路由逻辑

```
function selectModel(user: User, usage: UsageRecord): string {
  if (user.plan === "basic") {
    if (usage.articles_generated >= BASIC_MONTHLY_SOFT_LIMIT) {
      return "deepseek-v3"  // 超量自动降级
    }
    return "deepseek-v3"    // 基础版默认 DeepSeek
  }

  if (user.plan === "pro" || user.plan === "team") {
    if (usage.articles_generated >= PRO_MONTHLY_SOFT_LIMIT) {
      return "gpt-4o-mini"  // 软降级，用户几乎无感知
    }
    return "gpt-4o"         // 专业版/团队版默认 GPT-4o
  }
}
```

---

## 五、发布连接器接口规范

### WordPress

```
POST https://{site_url}/wp-json/wp/v2/posts
Authorization: Basic base64(username:app_password)
Content-Type: application/json

{
  "title": "文章标题",
  "content": "<html>文章内容</html>",
  "status": "publish" | "draft",
  "categories": [id],
  "tags": [id],
  "meta": {
    "_yoast_wpseo_focuskw": "目标关键词",
    "_yoast_wpseo_metadesc": "Meta 描述"
  }
}
```

### Shopify

```
POST https://{shop}.myshopify.com/admin/api/2024-01/blogs/{blog_id}/articles.json
X-Shopify-Access-Token: {access_token}

{
  "article": {
    "title": "文章标题",
    "body_html": "<html>内容</html>",
    "tags": "seo, content",
    "published": true
  }
}
```

### 自定义 Webhook

```
POST {user_defined_url}
X-API-Key: {user_defined_key}
Content-Type: application/json

{
  "title": "文章标题",
  "content": "Markdown 格式内容",
  "seo": {
    "target_keyword": "关键词",
    "meta_description": "描述",
    "slug": "url-slug"
  },
  "metadata": {
    "generated_at": "ISO8601",
    "source": "seomachine"
  }
}
```

---

## 六、Redis 用量计数器设计

```
# Key 命名规范
user:{userId}:daily:{YYYY-MM-DD}:count       # 今日生成篇数
user:{userId}:monthly:{YYYY-MM}:count        # 本月生成篇数
user:{userId}:monthly:{YYYY-MM}:tokens       # 本月消耗 token 数

# TTL
daily 计数器：TTL = 25 小时（自动过期，无需手动重置）
monthly 计数器：TTL = 32 天

# 请求缓存
cache:article:{keyword_hash}                  # 相同关键词的缓存结果
TTL = 7 天
```

---

## 七、待确认事项

- [ ] 后端是 Next.js API Routes 还是独立 Node.js 服务（或 Python FastAPI）？
- [ ] PostgreSQL 托管方案：Supabase vs Neon vs 自托管？
- [ ] Python SEO 引擎如何集成：子进程 vs 独立微服务 vs 重写为 TypeScript？
- [ ] 流式生成（SSE / WebSocket）：前端如何实时展示 AI 输出？
- [ ] Shopify OAuth App 注册（需要 Shopify Partner 账号）
- [ ] 内容缓存策略：相同关键词 + 相同 brief 才命中？或只匹配关键词？
- [ ] 是否需要 CDN（图片、静态资产）？MVP 阶段可以先不考虑
