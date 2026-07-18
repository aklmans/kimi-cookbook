import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTracker } from "@/components/PageTracker";
import { T } from "@/components/T";

export const metadata: Metadata = {
  title: "License",
  description:
    "《Kimi · 从长文本到一套 agent 栈》的内容遵循 CC BY-NC-ND 4.0 协议: 允许免费阅读、AI 摘读、引用与转发, 禁止商业再发布与衍生改写。",
  alternates: { canonical: "/license" },
  openGraph: {
    type: "website",
    title: "License · Kimi",
    description:
      "Content of the Kimi book is licensed under CC BY-NC-ND 4.0 — free to read, quote, and share; no commercial reuse, no derivatives.",
    url: "/license",
    siteName: "Kimi Cookbook",
  },
};

export default function LicensePage() {
  return (
    <>
      <PageTracker pageSlug="license" />
      <SiteHeader />
      <main className="v3-page" id="main">
        <section className="v3-cover v3-cover--chapter">
          <p className="v3-cover__eyebrow">
            — <T zh="协议" en="License" />
          </p>
          <h1 className="v3-cover__title">
            <T zh="内容与代码的许可" en="Content and Code License" />
            <span className="stop">.</span>
          </h1>
          <p className="v3-cover__lede">
            <T
              zh="书归内容许可, 代码归代码许可 —— 两块分开声明, 清清楚楚。"
              en="Book content has its own license; source code has its own. Two halves, declared separately, kept honest."
            />
          </p>
          <hr className="v3-cover__rule" />
        </section>

        {/* Content license */}
        <header className="section-head">
          <p className="section-head__label">
            — <T zh="书的内容" en="Book Content" />
          </p>
          <h2 className="section-head__title">
            <T zh="CC BY-NC-ND 4.0" en="CC BY-NC-ND 4.0" />
            <span className="stop">.</span>
          </h2>
        </header>

        <div className="prose">
          <p lang="zh">
            所有书的正文、章节 MDX、引用、配图, 以及
            <code>/books/&lt;slug&gt;/llms.md</code> 路由返回的 markdown,
            遵循 <em>Creative Commons 署名 - 非商业性使用 - 禁止演绎 4.0
              国际</em> 协议 (CC BY-NC-ND 4.0)。
          </p>
          <p lang="en">
            All book prose, chapter MDX, citations, and illustrations —
            plus the markdown served at <code>/books/&lt;slug&gt;/llms.md</code> —
            are licensed under <em>Creative Commons Attribution-NonCommercial-
              NoDerivatives 4.0 International</em> (CC BY-NC-ND 4.0).
          </p>
          <p lang="zh">允许做的事:</p>
          <p lang="en">What you may do:</p>
        </div>

        <ul className="v3-list v3-list--ul">
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="自由阅读、引用、分享、转发链接 (任何媒介)"
                en="Read, quote, share, and link the books in any medium"
              />
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="把 markdown 喂给 AI 做摘要、问答、学习笔记、个人参考"
                en="Feed the markdown to AI agents for summarization, Q&A, study notes, and personal reference"
              />
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="保留作者 (Zhapar) 署名 + 原文 URL"
                en="Retain the author's name (Zhapar) and the canonical URL"
              />
            </span>
          </li>
        </ul>

        <div className="prose">
          <p lang="zh">不允许做的事:</p>
          <p lang="en">What you may not do:</p>
        </div>

        <ul className="v3-list v3-list--ul">
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="商业再发布 (套广告、付费墙、打包成付费产品、卖给第三方做 AI 训练数据集)"
                en="Commercial reuse (rehosting with ads, paywalled republication, repackaging into a paid product, selling as AI training data to third parties)"
              />
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="改写衍生 (再翻译、改写洗稿、以他人名义重新发布、SEO 内容农场)"
                en="Derivative works (re-translation, rewording, republishing under someone else's name, content-farm rewrites)"
              />
            </span>
          </li>
        </ul>

        <div className="prose">
          <p lang="zh">
            协议全文:{" "}
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.zh">
              creativecommons.org/licenses/by-nc-nd/4.0/deed.zh
            </a>
          </p>
          <p lang="en">
            Full license:{" "}
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
              creativecommons.org/licenses/by-nc-nd/4.0
            </a>
          </p>
          <p lang="zh">
            想做协议之外的事 (授权翻译、课件再分发等), 写信给{" "}
            <a href="mailto:hi@zhaphar.com">hi@zhaphar.com</a>。
          </p>
          <p lang="en">
            For reuse beyond these terms (authorized translations, academic
            course packs, and the like), email{" "}
            <a href="mailto:hi@zhaphar.com">hi@zhaphar.com</a>.
          </p>
        </div>

        <div className="v3-divider" aria-hidden="true" />

        {/* Code license */}
        <header className="section-head">
          <p className="section-head__label">
            — <T zh="站点源码" en="Source Code" />
          </p>
          <h2 className="section-head__title">
            <T zh="保留所有权利 (暂)" en="All Rights Reserved (for now)" />
            <span className="stop">.</span>
          </h2>
        </header>

        <div className="prose">
          <p lang="zh">
            仓库里 Next.js 应用代码、React 组件、构建脚本、CSS 扩展、MDX
            组件库等所有非内容部分, 暂时 <em>保留所有权利</em>。
            仓库公开是为了让人看到这个站怎么搭、提 Issue 反馈, 但代码复用
            需要先经过作者授权。
          </p>
          <p lang="en">
            Everything else in the repo — Next.js code, React components,
            build scripts, CSS extensions, the MDX component library — is{" "}
            <em>all rights reserved</em> for now. The repo is public so
            others can see how the site is built and file issues; reuse
            requires permission.
          </p>
          <p lang="zh">
            想用某一段代码, 写信告诉我用途, <a href="mailto:hi@zhaphar.com">hi@zhaphar.com</a>。
            未来开源整套代码的可能性也在考虑里。
          </p>
          <p lang="en">
            If you want to reuse a specific piece, email me with the use
            case at <a href="mailto:hi@zhaphar.com">hi@zhaphar.com</a>.
            Open-sourcing the whole site is on the to-do list.
          </p>
        </div>

        <div className="prose">
          <p lang="zh">
            仓库源码: <a href="https://github.com/aklmans/kimi-cookbook">github.com/aklmans/kimi-cookbook</a>
          </p>
          <p lang="en">
            Source repository:{" "}
            <a href="https://github.com/aklmans/kimi-cookbook">github.com/aklmans/kimi-cookbook</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
