# Kimi · 从长文本到一套 agent 栈

Zhapar 写的单本电子书站 —— 给已经在付费 Kimi、却只用到一小部分的人:
K3 旗舰与 K2.7-Code 撑起的一套 agent 栈, 每块产品干什么、买哪档够用、
什么时候回 frontier。站点: <https://kimi.read.wiki>

视觉与原型 1:1 (v3 *Editorial Reading* 设计语言, `assets/v3.css` 逐字
verbatim 移植), 工程是 Next.js 16 + Tailwind v4 + MDX. 设计语言的端到端
文档见 **[DESIGN.md](./DESIGN.md)** —— 跨项目复用也可以读那一份。

---

## 书架现状

15 本书分 3 个 shelf, 通过 `BookMeta.draft` 控制可见性, 通过
`BookMeta.language` 控制语言形态:

| Shelf | 已上线 | 草稿 |
|---|---|---|
| **Platform Bundle** (一份订阅里的全部产品) | Anthropic · OpenAI · Cursor · Warp · Google · Kimi · 豆包 · 通义 | — |
| **Workflow** (一种工作场景串多个工具) | — | 知识工作流 · 开发者工作流 · 自媒体工作流 · 学习工作流 |
| **Agent Platform** (深度讲一个复杂 agent 系统) | OpenCode · Hermes · OpenClaw | — |

公开 11 本, 草稿 4 本 (workflow 系列全部 `draft: true`, 等正文落地后翻
flag 即上线)。zh-only 7 本: 豆包 / 通义 / Kimi + 4 本 workflow.

---

## 技术栈

| 部件 | 选择 |
|---|---|
| 框架 | **Next.js 16** (App Router, Turbopack) |
| 语言 | TypeScript (strict) · React 19 |
| 样式 | Tailwind CSS **v4** + 逐字移植的 `v3.css` |
| 内容 | MDX, 经 `next-mdx-remote/rsc` 的 `compileMDX` 渲染 |
| 主题 | `next-themes` (`data-theme`) |
| 搜索 | `fuse.js` (⌘K 命令面板) |
| RSS | `feed` (`/feed.xml` Route Handler) |
| 评论 | `@giscus/react` (Giscus, 可选) |
| 字体 | `next/font/google` — Playfair Display / Source Serif 4 / Noto Serif SC / Inter / JetBrains Mono |
| 品牌图标 | `@lobehub/icons` (窄路径 import, 按 slug 取用) |
| PDF | Playwright headless Chromium 走 `/books/<slug>/print` 路由出 PDF |

---

## 本地启动

```bash
npm install
npm run dev      # http://localhost:3000
```

构建与本地预览生产版本:

```bash
npm run build
npm start
```

阿里云宝塔 + GitHub Actions 的生产部署、Nginx、PM2、定时任务和回滚步骤见
**[docs/DEPLOYMENT_ALIYUN.md](./docs/DEPLOYMENT_ALIYUN.md)**。

测试 + 质量检查:

```bash
npm test          # quality-check.mjs(静态校验)+ test:unit(分析后端单元/集成测试)
npm run test:static  # 只跑 quality-check —— meta 一致性、引用、占位文本扫描
npm run test:unit    # 只跑 tests/analytics/*.test.ts(node:test via tsx)
npm run lint
npx tsc --noEmit  # 类型检查
```

`npm test` 现在会先跑 `quality-check.mjs`(静态断言),再跑
`tests/analytics/` 下的单元/集成测试 —— 覆盖限流器、访客分类、`queryAnalytics`
指标(唯一访客 / 完成率封顶 / 趋势零填充 / 来源 scope / 站点信号)、事件路由
(会话-访客拆分 / 体积-速率限制 / 信号净化)、查询路由 DB 故障处理、rollup +
prune + cron 鉴权。集成测试用临时 SQLite(每个测试文件独立进程 + 独立库),
不碰 `./data/analytics.db`。

提交前完整跑过这 4 个 + `npm run build`. 三个 PDF 印刷 cover 的 quality
check 失败是已知的 (前扉页满版排版 vs A4 印刷边距冲突, 留到正文阶段
重做时一起处理), 其它失败都得修.

内部设计系统参考页用环境变量打开:

```bash
NEXT_PUBLIC_INTERNAL=1 npm run dev   # 然后访问 /internal/showcase
```

---

## 数据层

每本书是一个目录 + `meta.ts` + 章节 MDX:

```
content/books/<slug>/
  meta.ts                          BookMeta — 真值源
  chapters/<chapter-slug>.mdx      章节正文 (或 draft 占位)
```

`BookMeta` 完整字段见 `lib/types.ts`. 关键字段:

```ts
{
  slug: "anthropic",               // URL slug
  title: "...",                    // 中文书名 (必填)
  titleEn: "...",                  // 英文书名 (zh-only 书填 "")
  subtitle: "...",                 // 副标 (optional)
  subtitleEn: "...",               // 英文副标 (optional)
  description: "...",              // 详情页 lede + RSS / OG description
  descriptionEn: "...",            // (zh-only 书填 "")
  cover: "/books/<slug>/cover.jpg",
  author: "Zhapar",
  date: "2026-05-23",              // 库列表排序依据 (YYYY-MM-DD)
  language: "zh-en" | "zh",        // ← 决定语言徽章 + EN 模式 fallback
  tags: ["TECH", "PRACTICE"],
  category: "TECH",
  readMinutes: 55,                 // = sum(chapters[].readTime)
  nextBook: "openai",              // 阅读链路 (会跳过 draft 书)
  draft: true,                     // ← 加上 → 整本书隐藏
  chapters: [
    {
      slug: "01-intro",
      title: "...",
      titleEn: "...",              // (zh-only 书填 "")
      readTime: "5 MIN",
      publishedAt: "2026-05-01",   // RSS 排序依据
      revisions: [{ v: 1, date: "2026-05" }],
      lede: "...",                 // 章节封面副标 + RSS description
      ledeEn: "...",               // (optional, zh-only 书省略)
      isLastChapter: true,         // 末章 → 触发 <NextBook> 推荐卡
      draft: true,                 // ← 加上 → 章节渲染 <DraftNotice>
    },
  ],
}
```

新书新章不需要手动加到任何中央数组 —— `lib/books.ts` 的 `BOOKS`
manifest 是 import-based, 首页 / 库 / RSS / 搜索全部自动聚合.

---

## 添加一本新书

1. 选 slug, 新建目录: `content/books/<slug>/chapters/`
2. 写 `content/books/<slug>/meta.ts` (参考 `content/books/anthropic/meta.ts`)
3. 写章节 MDX stub (复用以下模板):

   **双语书 stub**:
   ```mdx
   <Cover />

   <SectionTitle number="I"><T zh="正文待撰" en="Draft in Progress" /></SectionTitle>

   本章节的正文还未撰写。书的整体框架与目录已经定下来; 章节正文会陆续补全。

   The chapter body is still being drafted. The book's structure and outline are set; the per-chapter prose will land progressively.

   <Kicker
     zh={"骨架先立住,\n文字再慢慢落"}
     en={"Skeleton first,\nprose to follow"}
   />
   ```

   **zh-only 书 stub**:
   ```mdx
   <Cover />

   <SectionTitle number="I"><T zh="正文待撰" /></SectionTitle>

   本章节的正文还未撰写。书的整体框架与目录已经定下来; 章节正文会陆续补全。

   <Kicker zh={"骨架先立住,\n文字再慢慢落"} />
   ```

4. 在 `lib/books.ts` import + 加进 `BOOKS` 数组
5. 在 `lib/cover-brand.ts` 加 brand entry (label / mark / accent / hasLobeIcon)
6. 如果用 lobehub icon: 在 `components/BookCoverLogo.tsx` 加 slug 分支
   (narrow import: `@lobehub/icons/es/<Brand>/components/{Mono,Color,Text}`)
7. 如果 wordmark 太宽 / 太短超出 / 不够撑满缩略图组合块, 在 `app/globals.css`
   Round-N 区域里加 per-brand thumbnail tuning (参考 anthropic / cursor /
   kimi 的 override 模板)
8. 更新链路: 把前一本的 `nextBook` 指向新书 slug
9. `npm run build` + `npm test` 验证

---

## 草稿模式

- **整本草稿** (`meta.ts` 顶层 `draft: true`):
  - 从 library / 首页 / RSS / 搜索 / OG / nextBook chain 全部消失
  - 所有相关静态路由不构建 (`/books/<slug>` / `/<chapter>` / `/print` / `/og`)
  - 直接访问 URL 自动 404
  - 阅读链路上隔的位置: tongyi.nextBook → knowledge-work (draft), 跳过 →
    tongyi 末章不显示「下一本」推荐. workflow 取消 draft 后链路自动恢复
- **章节草稿** (chapter entry `draft: true`):
  - 章节仍在书 TOC 显示, 右侧时间位置变 "DRAFT" 暖橙标识, 标题变 ink-3 灰
  - 点进去渲染 `<DraftNotice>`: 章节封面 + 居中编辑卡, 不读不编 MDX 文件
  - PDF 印刷版同样行为
  - 搜索 / RSS 跳过该章
  - OG 图仍生成

正文写完 → 把 `draft: true` 删掉 → 重新 build → 上线.

---

## 语言处理

`BookMeta.language: "zh-en" | "zh"` 决定本书是双语还是仅中文.

**双语书** (默认, language = "zh-en"):
- 所有 `titleEn / descriptionEn / chapter.titleEn / ledeEn` 必填
- `<T zh={...} en={...} />` 两套都给, 用户切语言看对应版本

**zh-only 书** (language = "zh"):
- 所有 English 字段填空字符串 `""` 或省略 (optional 字段)
- `<T zh={...} />` 省略 `en` prop, 切到 EN 模式自动 fallback 显示中文
- 章节 MDX 段落直接用中文, 不用包 `<T>` (plain text 不受 lang 切换影响)
- 书详情页在 EN 模式下显示 "This book is currently available in Chinese only"
  提示 (mono uppercase accent), ZH 模式下不显示
- 库列表行右侧自动显示 "中" 徽章 (双语书是 "中英")
- 大封面 italic 英文副标自动隐藏

---

## 封面系统

每本书的封面由 `BookMeta.cover` 真实图片优先, 缺图时走 `<CoverArt>`
typographic 兜底.

**Brand 配置** (`lib/cover-brand.ts`):
- `label` — 兜底显示的 brand 名称
- `mark` — 缺 lobehub icon 时显示的 2-3 字母 mono mark
- `accent` — 品牌色 (#xxxxxx), 用于 logo 着色 / 1px rule 线 / OG image
- `hasLobeIcon: true` → 走 `BookCoverLogo` (`components/BookCoverLogo.tsx`)
  渲染 lobehub icon + wordmark
- `hasLobeIcon: false` → 走 typographic 兜底 (`<CoverArt>` 的 mark 文字)

**Workflow 书的特殊处理**: workflow 没有单一品牌 logo, 用单中文字符 +
英文 mono workmark. `BookCoverLogo` 的 `WORKFLOW_MARKS` 表里加一条:
```ts
"knowledge-work": { char: "知", code: "KNOWLEDGE" },
```
再到 `lib/cover-art.tsx` 的 `CUSTOM_LOGO_SLUGS` 集合里加 slug.

**Thumbnail 组合块宽度对齐**: 缩略图里 icon + wordmark 总宽要落在
~100-115px (库容器去 padding 后 ~124px 可用), 太宽溢出, 太窄看起来空.
每个品牌的 wordmark viewBox aspect 不同, 需要 per-brand 微调
`--cover-combine-icon-size` / `--cover-combine-text-size`. 现有模板:

- Anthropic (wordmark 182/24 太宽): icon 28px + text 10pt
- OpenCode / OpenClaw (wordmark 138-140/24): icon 36px + text 11pt
- Cursor (wordmark 123/24): icon 38px + text 12pt
- Doubao (wordmark 105/24): default icon + text 12pt
- Kimi (wordmark 52/24 太短): bump text 18pt
- Hermes (wordmark 52/24 太短): bump text 22pt
- Knowledge/Developer-Work (workmark 9字): icon 40px + text 12pt
- Study-Work (workmark 5字 太短): bump text 18pt

参考 `app/globals.css` Round-5/Round-6 区域的 per-brand override 块.

---

## PDF 生成

每本书都有一份印刷级 PDF, 由 v3.css 既有的 `@media print` 排版 +
专门的 print 路由 `/books/<slug>/print` 组合而成. 两条路径同源:

**1. 浏览器另存 (零配置)** —— 「下载 PDF ↓」按钮在缺少静态 PDF 时
落到 `/books/<slug>/print?print=1`, 新页打开后自动弹出打印对话框,
浏览器里选 "另存为 PDF".

**2. Playwright 预生成 (印刷级首选)** —— headless Chromium 直接
吃 print 路由产 PDF:

```bash
npm install                       # 含 playwright
npx playwright install chromium   # 浏览器二进制 (~280MB)

npm run build
npm start                         # 在另一终端起 :3000
npm run pdf                       # 全部书 → public/books/<slug>.pdf
```

### Bilingual PDF exports

`language: "zh-en"` 的书会生成两份静态文件:

- `public/books/<slug>.pdf` — 中文版, 访问 `/books/<slug>/print?lang=zh`
- `public/books/<slug>.en.pdf` — 英文版, 访问 `/books/<slug>/print?lang=en`

`language: "zh"` 的书只生成 `public/books/<slug>.pdf`. 详情页的「下载
PDF ↓」按钮按当前阅读语言选择文件: 中文模式指向 `<slug>.pdf`; 英文模式
优先指向 `<slug>.en.pdf`, 若还未预生成静态英文 PDF, 则 fallback 到
`/books/<slug>/print?print=1&lang=en`. 这条规则避免英文界面下载到中文
PDF, 也避免 Playwright 继承浏览器本地语言状态导致导出串语种.

产物落地后, 「下载 PDF ↓」按钮自动改成直链静态文件下载. 内容或样式改动
后必须重新跑 `PDF_BASE_URL=<server> npm run pdf`, 否则 `public/books/*.pdf`
会停留在旧样式或旧语言内容.

**印刷级特性:**

- A4 trim · 22/20/24/20mm 边距 (v3.css 的 `@page`)
- 矢量文字 · 字体自动内嵌
- 每章 / 每节自动起新页 · 引用块 / 代码块 / 插图整块不切页
- 底部 `01 / 64` 页码 + 右下角 `AKLMAN` 角标 (v3.css `@page :left/:right` 的
  `counter(page) / counter(pages)`)
- 无浏览器叠加的页眉页脚 (`displayHeaderFooter: false`)
- 全局 `print-color-adjust: exact` —— 嵌套元素背景色 (Kimi tile / code
  block 米底等) 即使是 nested 也保留, 否则 Chromium 会丢
- 章节顶部 byline 在 PDF 隐藏 (印刷书不需要每章 "5 min read" 戳)
- 草稿章节在 PDF 也走 `<DraftNotice>` 占位, 不读 MDX 文件

`public/books/*.pdf` 默认 gitignore —— 想让线上也直链下载就
`git add -f public/books/*.pdf` 提交.

---

## 评论 (Giscus, 可选)

章末评论挂在 GitHub Discussions 上, 由 [Giscus](https://giscus.app/) 渲染.
启用方法 —— 拷一份 `.env.example` 成 `.env.local`, 填入 `giscus.app`
给你的四个值:

```bash
NEXT_PUBLIC_GISCUS_REPO=owner/repo
NEXT_PUBLIC_GISCUS_REPO_ID=R_xxxxxxxxxx
NEXT_PUBLIC_GISCUS_CATEGORY=Comments
NEXT_PUBLIC_GISCUS_CATEGORY_ID=DIC_xxxxxxxxxx
```

Mapping 用 `pathname` —— 每个章节 URL 对应一条独立 Discussion.
主题随 `next-themes` 切换 (浅 / 深). 四个变量缺任何一个,
`.discussion` 区段直接隐藏.

**自定义主题** —— `public/giscus-v3-{light,dark}.css` 是按 v3 调性写
(纸感底、暖橙重音、Source Serif 正文、JetBrains Mono 标签、0.5px 边、
零圆角). HTTPS 部署后自动从 `window.location.origin` 拉到这两份 CSS;
本地 dev (HTTP) 因混合内容限制退回 Giscus 内置 `light` / `dark`. 这是
预期行为 —— 评论功能仍可用, 只是本地评论区样式不会完全等同生产环境.

---

## 项目目录结构

```
app/
  layout.tsx                       根布局 · 字体 · Providers · GlobalUI
  page.tsx                         首页 (源: index.html)
  library/page.tsx + Filter.tsx    作品列表 (源: library.html)
  library/tag/[tag]/page.tsx       标签路由
  about/page.tsx                   关于 (源: about.html)
  books/[slug]/page.tsx            单本书目录 (源: book.html)
  books/[slug]/opengraph-image.tsx 书级 OG 图
  books/[slug]/[chapter]/          单章阅读 (源: chapter.html)
    page.tsx · ChapterShell.tsx · Discussion.tsx
    opengraph-image.tsx            章节级 OG 图
  books/[slug]/print/page.tsx      单本书 PDF 印刷路由
  feed.xml/route.ts                RSS 2.0 (源: rss.html)
  opengraph-image.tsx              站点级 OG 图
  not-found.tsx                    404 (源: 404.html)
  internal/showcase/page.tsx       设计系统参考 (env-gated)
  globals.css                      Tailwind + v3.css verbatim + Round-N

components/
  SiteHeader · SiteFooter · ThemeToggle · LangToggle · GlobalUI
  LangProvider · ThemeProvider · T (双语) · ReadingProgress
  ChapterOutline · AssetFrame · CoverArt · BookCoverLogo
  mdx/
    Cover · SectionTitle · H3 · Divider · Kicker
    Quote · CodeBlock · Tabs · Tab · Figure · Callout
    Footnote · References · DraftNotice
    elements (markdown → v3 vocabulary)

content/books/<slug>/
  meta.ts                          BookMeta 真值
  chapters/<chapter>.mdx           章节正文 / 草稿占位

lib/
  books.ts                         BOOKS manifest + 查询 + 日期辅助
  chapter-outline.ts               章内右侧目录提取 + 锚点注入
  types.ts                         BookMeta / Chapter / Revision
  cover-brand.ts                   slug → {label, mark, accent}
  cover-art.tsx                    bookCoverArt() 装配
  labels.ts                        分类 / 标签 / 语言徽章
  format.ts                        byline / readTime 格式化
  searchIndex.ts                   ⌘K 搜索索引 builder (跳过草稿)
  public-assets.ts                 build-time fs check
  site.ts                          SITE_URL / SITE_YEAR / absoluteUrl
  og-fonts.ts                      next/og 字体加载 (Playfair + JBM)
  words.ts                         derive word count from MDX bodies

scripts/
  build-pdfs.mjs                   Playwright PDF 批量生成
  quality-check.mjs                meta 一致性 + 内容校验
```

---

## 内容维护规则

- `readMinutes` 应与 `chapters[].readTime` 求和保持一致 (`npm test` 校验)
- 章节 frontmatter 里的 `references[].id` 必须与正文 `<Footnote n={...} />`
  双向匹配 (`npm test` 校验)
- 章节必须显式写 `publishedAt: "YYYY-MM-DD"` —— RSS 排序依据,
  避免订阅器排序含糊
- 封面图优先读取 `public/books/<slug>/cover.*`; 缺图时使用 `CoverArt`
  Logo 兜底, 不显示尺寸占位文字 —— 真实封面随时替换同一路径
- 搜索索引来自书名 / 章节标题 / lede / MDX 组件文本 / 正文片段 ——
  希望被搜索命中的核心短语写进正文或标题
- 内容改动后跑 `npm test`; 提交前跑完整质量门:
  `npm test && npm run lint && npx tsc --noEmit && npm run build`

---

## Analytics / Stats

`/internal/stats` 是登录保护页面, 用于查看内容访问、阅读参与度和
agent/feed 诊断数据。生产环境需要配置:

```env
ANALYTICS_SECRET=<long random value>
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=<turso auth token>
CRON_SECRET=<long random value>          # 鉴权每日 rollup/prune cron
ANALYTICS_RETENTION_DAYS=90              # 可选, raw events 保留天数, 默认 90
```

`ANALYTICS_SECRET` 是 stats 初始/bootstrap 密码种子; 后续可在面板里改密
码。`DATABASE_URL` 指向持久化 analytics 数据库; Turso/libsql 生产库还需要
与之成对配置的 `DATABASE_AUTH_TOKEN`。本地开发与阿里云单机部署未配置时会
回退到持久化的 `./data/analytics.db`。

隐私口径保持克制: analytics 不保存原始 IP, 也不保存 IP hash。国家/地区
只读取部署平台提供的 header: `x-vercel-ip-country` 与
`x-vercel-ip-country-region`。UA 不长期保存原文; 普通 page/book/chapter
事件只保留分类维度: visitor kind、device、browser、os。raw UA 只保留在
agent/feed 诊断字段里, 不用于普通访问事件展示。

阅读时长来自章节页 heartbeat:

- `visible_ms` 是页面处于 visible 状态的累计时间。
- `active_ms` 是 visible 且最近有用户活动的累计时间。
- heartbeat 是累计快照, 不是增量。
- 查询聚合必须先按 session/chapter 取 `MAX(active_ms)` /
  `MAX(visible_ms)` / `MAX(scroll_depth)`, 再计算平均、参与度或漏斗。

数据保留: Vercel 可由 `vercel.json` cron、阿里云由宝塔计划任务调用
`ops/analytics-rollup.sh`, 每天先 rollup
到 `daily_stats`(聚合计数长期保留), 再删除超过保留窗口的 raw events —— 因为
先 rollup 再 prune, 被删天的聚合计数仍留在 `daily_stats`。保留窗口由
`ANALYTICS_RETENTION_DAYS` 控制(默认 90 天); heartbeat(每 20s 一条)是 raw
体量大头, 这样 events 表不再无上限增长。cron 用 `CRON_SECRET` 鉴权(Vercel
Cron 会带 `Authorization: Bearer $CRON_SECRET`); 也可以在 dashboard 里以登录
态 `POST /api/analytics/rollup` 手动触发。

指标口径: 面向"人"的数字(书/页浏览、完成、漏斗、参与度、来源等)已排除被判定
为 bot / 爬虫 / AI agent / feed reader 的事件; `agent_read` / `feed_read` 作为
独立指标单列, Audience(访客构成)一栏仍展示完整的 human/bot/agent 分布。

访客身份: 每个浏览器持有两个 first-party 随机 id —— 一个存在 `sessionStorage`
的 per-tab `session_id`(关标签即失效, 用于聚合单次阅读会话), 一个存在
`localStorage` 的持久 `visitor_id`(跨标签/刷新/回访保留)。二者都是随机 UUID,
不含任何 PII, 不写 cookie, 读者清除站点存储即重置。持久 `visitor_id` 支撑
Insights 面板的独立访客 / 回访 / 新访客指标(回访 = 时间窗内在 ≥2 个自然日出现),
这些计数只统计"人"(严格 human 过滤, 不含 agent/feed reader)。

摄入防护: 公开的 `POST /api/analytics/event` 端点有体积上限(单条请求
`> 4 KB` → 413)和进程内速率限制(按 `visitor_id`/`session_id` 计数, 默认
`120 条/60s`, 超出 → 429 带 `Retry-After`)。速率限制是每实例内存态、不落库、
不读 IP —— 挡的是单一客户端刷接口, 与 bot 过滤 + 保留期裁剪共同兜住体量。运维
可见性: 所有 `app/api/analytics/*` 路由都钉了 `runtime = "nodejs"`(它们经
`db` / `analytics-auth` 间接依赖 better-sqlite3 / libsql / scrypt 等 node-only
模块); 查询接口在 DB 故障时返回结构化 500(`{ error: "database", message }`),
面板据此在错误条里显示可操作的原因, 而不是静默显示 0 或空白。

站点信号(UX signals): 除书/页浏览外, 还记录三类站点级信号 —— 出站链接点击
(`outbound_click`)、站内搜索词(`search_query`, 输入停止 ~1.2s 后记录「落定」
的词, 而非每个前缀)、404(`not_found`)。三者都不绑定具体书/页, payload 存在事件
`extra` 列、挂在哨兵 `book_slug`(`_outbound`/`_search`/`_404`)下, 因此不会混进
书/页指标。写入前统一净化并封顶: 出站只留目标 host(外链才记)、搜索词 trim +
小写 + 折叠空白(≤80 字)、404 只留 pathname(丢掉 query/hash, 不落任何 URL 里
可能夹带的杂串或 PII, ≤200 字)。面板在 Pages 一栏展示各自 Top 榜。

---

## 生产部署

生产环境由 `.github/workflows/deploy.yml` 统一负责：PR 执行质量门禁，`main`
push 构建 standalone release 并发布到阿里云。服务器、GitHub Actions、Turso、
Nginx、PM2、定时任务和回滚的完整配置见
**[docs/DEPLOYMENT_ALIYUN.md](./docs/DEPLOYMENT_ALIYUN.md)**。

---

*Kimi · 从长文本到一套 agent 栈*
