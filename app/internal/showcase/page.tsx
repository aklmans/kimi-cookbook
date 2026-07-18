import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { T } from "@/components/T";
import { CanonAlbum } from "@/components/mdx/CanonAlbum";
import { Quote, CodeBlock } from "@/components/mdx/blocks";
import { Divider } from "@/components/mdx/structure";
import { InternalRibbonClass } from "./InternalRibbonClass";

/* Internal design-system reference — source: showcase.html.
   Gated behind NEXT_PUBLIC_INTERNAL=1. This env var is build-time
   inlined, so deployed changes require a rebuild; see README. */

export const metadata: Metadata = {
  title: { absolute: "Kimi · 设计系统参考" },
};

const SWATCHES: { name: string; hex: string; accent?: boolean }[] = [
  { name: "bg", hex: "#FAFAFA" },
  { name: "ink", hex: "#1A1A1A" },
  { name: "ink-2", hex: "#3A3A3A" },
  { name: "ink-3", hex: "#6B6B6B" },
  { name: "rule", hex: "#9A9A9A" },
  { name: "border", hex: "#C0BFBA" },
  { name: "accent", hex: "#1783FF", accent: true },
  { name: "code-bg", hex: "#F0EFEB" },
];

export default function ShowcasePage() {
  if (process.env.NEXT_PUBLIC_INTERNAL !== "1") notFound();

  return (
    <>
      <InternalRibbonClass />
      <div className="internal-ribbon">
        <T
          zh="内部 · 设计系统参考 · 非公开页面"
          en="Internal · Design System Reference · Not a Public Route"
        />
      </div>
      <SiteHeader />

      <main className="v3-page" id="main">
        <div className="index-wrap">
          {/* Hero */}
          <section className="index-hero">
            <p className="index-hero__eyebrow">
              — Phase 1 + 2 · 设计语言与阅读骨架
            </p>
            <h1 className="index-hero__title">
              先把语言立住<span className="stop">,</span>
              <br />
              再让产品长出来<span className="stop">.</span>
            </h1>
            <p className="index-hero__lede">
              这是 Aklman Library 的早期切片 —— 还没有首页、没有列表、没有 PDF
              导出。先把 v3 阅读子集的骨头摆好: tokens、组件、单本书目录页、单章阅读页。
              其它一切都从这里长。
            </p>
            <p className="index-hero__byline">Aklman · 2026.05.22 · For Review</p>
          </section>

          {/* Navigation cards */}
          <nav className="nav-grid" aria-label="原型导览">
            <Link className="nav-card" href="/books/anthropic">
              <p className="nav-card__num">— Phase 2 · A</p>
              <h2 className="nav-card__title">
                单本书目录页<span className="stop">.</span>
              </h2>
              <p className="nav-card__desc">
                封面 + 标题 + Lede + 章节目录 + 作者的话。
                鼠标停在任一章上, 整行左移 4px, 章节号变暖橙。
              </p>
              <span className="nav-card__route">/books/anthropic</span>
            </Link>

            <Link
              className="nav-card"
              href="/books/anthropic/01-intro"
            >
              <p className="nav-card__num">— Phase 2 · B</p>
              <h2 className="nav-card__title">
                单章阅读页<span className="stop">.</span>
              </h2>
              <p className="nav-card__desc">
                完整的 v3 长文版式 —— 扉页 / 章节标号 / H3 / 正文 / 引用 /
                代码块 / 列表 / 分隔符 / 收束 Kicker / 底部签名条。←/→ 翻章,
                顶部 0.5px 暖橙进度条, 滚动位置自动持久化。
              </p>
              <span className="nav-card__route">
                /books/anthropic/01-intro
              </span>
            </Link>
          </nav>

          {/* Tokens · color */}
          <section className="tokens">
            <header className="tokens__head">
              <p className="tokens__label">— Phase 1 · Color Tokens</p>
              <h2 className="tokens__title">
                颜色<span className="stop">.</span>
              </h2>
            </header>
            <div className="swatches">
              {SWATCHES.map((s) => (
                <div className="swatch" key={s.name}>
                  <div
                    className="swatch__chip"
                    style={{ background: `var(--${s.name})` }}
                  />
                  <span
                    className={`swatch__name${s.accent ? " accent" : ""}`}
                    style={s.accent ? { color: "var(--accent)" } : undefined}
                  >
                    {s.name}
                  </span>
                  <span className="swatch__hex">{s.hex}</span>
                </div>
              ))}
            </div>
            <div className="notes-grid">
              <div className="note">
                <p className="note__label">— Restraint</p>
                <p className="note__body">
                  暖橙 (accent) 全站只用于: 标题末尾的句号、章节标号 (— I)、
                  行内链接下划线、当前位置标记、hover 状态。一页内出现 1–2
                  次为佳, 永远不做大块背景。
                </p>
              </div>
              <div className="note">
                <p className="note__label">— Dual Theme</p>
                <p className="note__body">
                  浅色 (#FAFAFA / #1A1A1A) 与深色 (#1A1A1A / #FAFAFA)
                  是互为反演的同一套系统; accent 在深色下提亮为 #5E9FFF
                  以保持可读对比。点击右上 ☼/☾ 切换。
                </p>
              </div>
              <div className="note">
                <p className="note__label">— Rules vs Borders</p>
                <p className="note__body">
                  0.5px 实线 (border / rule) 是 v3 唯一允许的“装饰”。
                  所有分隔线宽度永远只在 0.5px / 1px / 1.5px
                  (引用与代码块左缘) 之间, 不存在更粗的边。
                </p>
              </div>
            </div>
          </section>

          {/* Tokens · type */}
          <section className="tokens">
            <header className="tokens__head">
              <p className="tokens__label">— Phase 1 · Typography Scale</p>
              <h2 className="tokens__title">
                字体<span className="stop">.</span>
              </h2>
            </header>
            <div className="type-grid">
              <div className="type-grid__label">Cover H1 · 52 / 1.08</div>
              <div className="type-grid__sample">
                <span className="ts-h1">
                  它本质上是什么<span className="stop">.</span>
                </span>
              </div>
              <div className="type-grid__label">Section H2 · 36 / 1.15</div>
              <div className="type-grid__sample">
                <span className="ts-h2">
                  三个文档<span className="stop">.</span>
                </span>
              </div>
              <div className="type-grid__label">H3 · 22 / 1.3 · 600</div>
              <div className="type-grid__sample">
                <span className="ts-h3">
                  为什么是 markdown<span className="stop">.</span>
                </span>
              </div>
              <div className="type-grid__label">Lede · 22 italic · 1.55</div>
              <div className="type-grid__sample">
                <span className="ts-lede">
                  一份记录三个项目使用 SDD 工作流的真实观察 ——
                </span>
              </div>
              <div className="type-grid__label">Body · 18 / 1.78</div>
              <div className="type-grid__sample">
                <span className="ts-body">
                  SDD 在我这边的实践被简化到极致 —— 不是某个 SaaS,
                  不是某个 IDE 插件, 只是三份 markdown 文档。
                  它们的位置在每个 repo 的根目录, 命名也几乎是固定的。
                </span>
              </div>
              <div className="type-grid__label">Blockquote · 22 italic</div>
              <div className="type-grid__sample">
                <span className="ts-quote">
                  速度本身, 不等于工程的胜利。可重复的速度才是。
                </span>
              </div>
              <div className="type-grid__label">Mono Label · 11 · 0.25em</div>
              <div className="type-grid__sample">
                <span className="ts-mono">
                  — By Aklman · 6 Min Read · 2026.03.15
                </span>
              </div>
              <div className="type-grid__label">Code · 14 / 1.85</div>
              <div className="type-grid__sample">
                <span className="ts-code">
                  const spec = readFile(&apos;requirements.md&apos;)
                </span>
              </div>
            </div>
          </section>

          {/* Components */}
          <section className="tokens" id="components">
            <header className="tokens__head">
              <p className="tokens__label">— Phase 1 · Components</p>
              <h2 className="tokens__title">
                组件库<span className="stop">.</span>
              </h2>
            </header>
          </section>
        </div>

        {/* Component demos */}
        <Quote source="v3 · Editorial Reading">
          奥卡姆剃刀 —— 任何“再加一点点装饰”的想法都要砍掉。
        </Quote>

        <CodeBlock caption="FIG. 00 · COVER COMPONENT · 8 LINES">
          {`// components/mdx/Cover.tsx
export function Cover(props: CoverProps) {
  return (
    <header className="v3-cover">
      …
    </header>
  )
}`}
        </CodeBlock>

        <section className="tokens" id="canon-album">
          <header className="tokens__head">
            <p className="tokens__label">— Round 58 · Canon Album</p>
            <h2 className="tokens__title">
              图解相册<span className="stop">.</span>
            </h2>
          </header>
          <CanonAlbum id="learning-is-compression" />
          <CanonAlbum id="good-spec-for-ai-agents" />
        </section>

        <ol className="v3-list">
          <li className="v3-list__item">
            <span className="v3-list__marker">01</span>
            <span className="v3-list__body">
              有序列表使用 Mono 14px 暖橙数字, 32px 列宽对齐。
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">02</span>
            <span className="v3-list__body">
              数字与正文之间用 grid 严格对齐, 不靠 padding 拼凑。
            </span>
          </li>
        </ol>

        <ul className="v3-list v3-list--ul">
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              无序列表的项目符号是 em dash, 暖橙 600 字重。
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              永远不使用圆点、方块或其它装饰性符号。
            </span>
          </li>
        </ul>

        <Divider />

        <div className="v3-kicker">
          <p className="v3-kicker__text">
            {"先把语言立住,\n不为了让单页好看, 而是为了\n让每一页都不会走偏"}
            <span className="stop">.</span>
          </p>
          <p className="v3-kicker__sig">Aklman · 2026.05.22</p>
        </div>
      </main>

      <footer className="v3-footer">
        <span>Aklman · 2026 · Phase 1 + 2</span>
        <span className="v3-footer__right">
          <Link href="/books/anthropic">Book</Link>
          <Link href="/books/anthropic/01-intro">Chapter</Link>
        </span>
      </footer>
    </>
  );
}
