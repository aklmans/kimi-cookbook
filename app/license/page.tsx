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
            <T zh="CC BY-NC-SA 4.0" en="CC BY-NC-SA 4.0" />
            <span className="stop">.</span>
          </h2>
        </header>

        <div className="prose">
          <p lang="zh">
            所有书的正文、章节 MDX、引用、配图, 以及
            <code>/books/&lt;slug&gt;/llms.md</code> 路由返回的 markdown,
            遵循 <em>Creative Commons 署名 - 非商业性使用 - 相同方式共享 4.0
              国际</em> 协议 (CC BY-NC-SA 4.0)。
          </p>
          <p lang="en">
            All book prose, chapter MDX, citations, and illustrations —
            plus the markdown served at <code>/books/&lt;slug&gt;/llms.md</code> —
            are licensed under <em>Creative Commons Attribution-NonCommercial-
              ShareAlike 4.0 International</em> (CC BY-NC-SA 4.0).
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
                zh="改进它: 纠错、更新、翻译、再混合 (欢迎来仓库提 PR)"
                en="Improve it: corrections, updates, translations, remixes (pull requests welcome)"
              />
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="保留作者 (Zhaphar) 署名 + 原文 URL"
                en="Retain the author's name (Zhaphar) and the canonical URL"
              />
            </span>
          </li>
          <li className="v3-list__item">
            <span className="v3-list__marker">—</span>
            <span className="v3-list__body">
              <T
                zh="衍生作品以同一协议 (CC BY-NC-SA 4.0) 共享"
                en="Share derivatives under the same license (CC BY-NC-SA 4.0)"
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
        </ul>

        <div className="prose">
          <p lang="zh">
            协议全文:{" "}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh">
              creativecommons.org/licenses/by-nc-sa/4.0/deed.zh
            </a>
          </p>
          <p lang="en">
            Full license:{" "}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">
              creativecommons.org/licenses/by-nc-sa/4.0
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
            <T zh="MIT 许可证" en="MIT License" />
            <span className="stop">.</span>
          </h2>
        </header>

        <div className="prose">
          <p lang="zh">
            仓库里 Next.js 应用代码、React 组件、构建脚本、CSS 扩展、MDX
            组件库等所有非内容部分, 以 <em>MIT 许可证</em>发布 —— 可自由使用、
            修改与再分发, 保留版权声明即可。
          </p>
          <p lang="en">
            Everything else in the repo — Next.js code, React components,
            build scripts, CSS extensions, the MDX component library — is
            released under the <em>MIT License</em>: free to use, modify and
            redistribute with the copyright notice intact.
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

        <div className="v3-divider" aria-hidden="true" />

        {/* Font credit */}
        <header className="section-head">
          <p className="section-head__label">
            — <T zh="字体致谢" en="Font Credit" />
          </p>
          <h2 className="section-head__title">
            <T zh="仓耳今楷" en="Tsanger JinKai" />
            <span className="stop">.</span>
          </h2>
        </header>

        <div className="prose">
          <p lang="zh">
            本站中文与英文正文字体为「仓耳今楷 05-W04」(另用 W05 字重),
            Copyright © <a href="https://tsanger.cn/">仓耳字库</a>。
            感谢仓耳字库开放旗下字体免费下载、允许个人使用 ——
            这本书和这座站的气质, 一半是这款字给的。
          </p>
          <p lang="en">
            The site&apos;s body typeface, for both Chinese and English, is
            Tsanger JinKai 05-W04 (with the W05 weight alongside), copyright ©{" "}
            <a href="https://tsanger.cn/">仓耳字库 (Tsanger)</a>. Our thanks to
            Tsanger for making their typefaces freely downloadable and free for
            personal use — half of this site&apos;s voice comes from this font.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
