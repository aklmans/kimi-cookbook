# Kimi Cookbook · 《Kimi · 从长文本到一套 agent 栈》

一个单本电子书站的全部源码 —— Zhapar 写的一本讲透 Kimi 产品栈的书(10 章),
以及承载它的网站、小程序内容 API 和部署链路。

- 在线阅读: <https://kimi.read.wiki>
- 作者: Zhapar · `hi@zhaphar.com` · [@ak_zhaphar](https://x.com/ak_zhaphar)

仓库是单书结构,但架构上支持 N 本书:`lib/books.ts` 的静态 manifest
目前只挂 `kimi` 一本,首页经 `next.config.ts` 的 rewrite 直接代理到书籍页。

## 这是什么

- **一本书**(`content/books/kimi/`):10 章 MDX + 结构化 meta
  (标题、引文、修订记录、海报摘要、修订日期),含引用脚注;
- **一个网站**(Next.js 16 App Router):逐字移植的 v3 *Editorial Reading*
  设计语言、仓耳今楷字体子集、章节大纲轨、阅读辅助栏(目录 / MD /
  让 Agent 读 / 二维码 / 海报)、giscus 评论、中英文 `<T>` 双语组件;
- **Agent 可读面**:全书与逐章 `llms.md`(含截断自检说明)、`/llms.txt`
  站点索引、`text/markdown` link alternates;
- **小程序内容 API**(`/api/mp/v1/*`):书籍/章节载荷(受限 HTML)、
  版本失效信标、关于页内容接口;
- **打印与分享**:每章打印页 + 整书 PDF(Playwright 渲染)、
  与小程序同构的章节分享海报(next/og);
- **第一方分析**(见下文「分析与隐私」)。

## 快速开始

```bash
npm ci
npm run dev        # http://localhost:3000
```

提交前门禁(CI 同样跑这四条):

```bash
npm test           # quality-check.mjs(元数据/脚注/占位符/契约钉住)+ 单元测试
npm run lint
npx tsc --noEmit
npm run build
```

可选:`SMOKE_BASE_URL=http://localhost:3000 npm run test:smoke`
(起服务后跑 70+ 端点与浏览器断言)。

## 目录速览

| 路径 | 内容 |
| --- | --- |
| `app/` | 路由:书籍页、章节页、打印页、`llms.md`、MP API、分析 API、OG/海报图 |
| `content/books/kimi/` | 书:`meta.ts` + 章节 MDX + `about.ts`(关于页内容模块) |
| `components/` | 站点组件;`components/mdx/` 是章节 MDX 词汇表 |
| `lib/` | 书籍/分析/渲染/字体等核心库;`lib/db.ts` 是多后端分析存储 |
| `ops/` | 部署脚本(release 切换、rollup、PM2 配置) |
| `promo/` | 小红书海报母版(HTML → PNG) |
| `scripts/` | 构建与质检脚本(PDF、字体子集、海报/视频、smoke) |
| `tests/` | 分析与部署相关的单元测试 |
| `docs/` | 部署文档(阿里云单机) |

## 分析与隐私

`/internal/stats` 是站点自带的第一方访问分析,设计约束:

- **无 IP、无 Cookie、无指纹**:事件只有类型、书目/章节、会话与访客随机 ID
  (localStorage UUID)、来源、UA 粗分类(人/搜索/AI agent/RSS);
  地理字段只来自平台头(Cloudflare/Vercel),不落任何 IP 或哈希;
- **不出站**:数据只进自己的数据库——本地 SQLite(开发默认)、
  或生产环境的 MySQL / Turso(`DATABASE_URL` 三选一,见
  `docs/DEPLOYMENT_ALIYUN.md`);
- 统计埋点全部开源:`app/api/analytics/event` 的入口校验、
  `lib/analytics-*` 的清洗与分类,可直接审。

## 部署

生产部署文档在 **[docs/DEPLOYMENT_ALIYUN.md](./docs/DEPLOYMENT_ALIYUN.md)**:
GitHub Actions 构建 → rsync 不可变 release → PM2 切换 → 三层健康校验
(运行时/release/构建 SHA、公网 canonical 与 cache-buster HTML)。
分析数据库支持本地 SQLite(默认持久化)、本机 MySQL、Turso 三种后端。

## License

- **书籍内容**(`content/books/**` 与 `llms.md` 镜像):**CC BY-NC-ND 4.0** —
  可读、可引、AI 可摘读,须署名 Zhapar 并保留原文链接;禁止商业再发布与衍生改写;
- **源码**(其余一切):**MIT**,见 [LICENSE.md](./LICENSE.md)。
