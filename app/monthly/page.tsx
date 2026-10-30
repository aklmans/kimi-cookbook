import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTracker } from "@/components/PageTracker";
import { Discussion } from "@/components/Discussion";
import { T } from "@/components/T";
import { Kicker } from "@/components/mdx/structure";
import { getLatestMonthlyIssue } from "@/lib/monthly";
import { CopyPromptButton } from "@/components/CopyPromptButton";
import { SITE_YEAR } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kimi Builders 月刊 · 泛 Builder 进化指南",
  description:
    "AI 时代 Universal Builders 的月度场景雷达与认知进化报告。超越写代码的狭窄定义，覆盖 用 AI 学习、用 AI 思考、用 AI 构建、用 AI 转型与用 AI 搞定一切。",
  alternates: { canonical: "/monthly" },
  openGraph: {
    type: "website",
    title: "Kimi Builders 月刊 · 进化指南",
    description:
      "超越写代码：用 AI 学习、用 AI 思考、用 AI 构建、用 AI 转型、用 AI 搞定一切。",
    url: "/monthly",
    siteName: "Kimi Cookbook",
  },
};

export default function MonthlyPage() {
  const issue = getLatestMonthlyIssue();

  return (
    <>
      <PageTracker pageSlug="monthly" />
      <SiteHeader />
      <main className="v3-page monthly-page" id="main">
        {/* Monthly Hero */}
        <section className="about-library monthly-hero" aria-labelledby="monthly-title">
          <div className="about-library__copy">
            <p className="about-library__eyebrow">
              — <T zh={`Kimi Builders 月刊 · 第 ${issue.volume} 期 · ${issue.month}`} en={`Kimi Builders Monthly · Vol. ${issue.volume} · ${issue.month}`} />
            </p>
            <h1 className="about-library__title" id="monthly-title">
              <T zh={issue.title} en={issue.titleEn} />
              <span className="stop">.</span>
            </h1>
            <p className="about-library__lede">
              <T zh={issue.subtitle} en={issue.subtitleEn} />
            </p>
            <p className="about-library__byline">
              <T
                zh={`Kimi Cookbook 社区编辑部 · Zhaphar · ${SITE_YEAR}`}
                en={`Kimi Cookbook Editorial · Zhaphar · ${SITE_YEAR}`}
              />
            </p>
            <hr className="about-library__rule" />
            <div className="about-library__intro">
              <p lang="zh">{issue.lede}</p>
              <p lang="en">{issue.ledeEn}</p>
            </div>
          </div>

          <aside className="about-library__aside" aria-label="Monthly facts">
            <dl className="about-facts">
              <div className="about-facts__row">
                <dt>
                  <T zh="定位" en="Vision" />
                </dt>
                <dd>
                  <T zh="泛 Builder 进化雷达" en="Universal Builders Radar" />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="周期" en="Frequency" />
                </dt>
                <dd>
                  <T zh="月度发布 · 社区共创" en="Monthly · Community Co-created" />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="维度" en="Pillars" />
                </dt>
                <dd>
                  <T zh="学 · 思 · 造 · 转 · 通" en="Learn · Think · Build · Transform" />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="形态" en="Format" />
                </dt>
                <dd>
                  <T zh="认知 + 案例 + 资产包" en="Shifts + Cases + Prompts" />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="主航道" en="Core Book" />
                </dt>
                <dd>
                  <Link href="/books/kimi">
                    <T zh="Kimi 全栈实战" en="Kimi Full Stack" />
                  </Link>
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="订阅" en="Subscribe" />
                </dt>
                <dd>
                  <a href="/feed.xml">RSS Feed</a>
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        {/* Section I: 认知雷达 (Paradigm Shift) */}
        <section className="about-section" aria-labelledby="shift-title">
          <header className="about-section__head">
            <p className="about-section__label">— I · 认知雷达</p>
            <h2 className="about-section__title" id="shift-title">
              <T zh={issue.paradigmShift.title} en={issue.paradigmShift.titleEn} />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="prose">
            {issue.paradigmShift.content.map((p, idx) => (
              <p key={idx} lang="zh">
                {p}
              </p>
            ))}
            {issue.paradigmShift.contentEn.map((p, idx) => (
              <p key={`en-${idx}`} lang="en">
                {p}
              </p>
            ))}
          </div>

          <div className="monthly-insights-grid">
            {issue.paradigmShift.keyInsights.map((insight, idx) => (
              <div key={idx} className="monthly-insight-card">
                <span className="monthly-insight-card__num">0{idx + 1}</span>
                <h3 className="monthly-insight-card__title">
                  <T zh={insight.title} en={insight.titleEn} />
                </h3>
                <p className="monthly-insight-card__desc">
                  <T zh={insight.desc} en={insight.descEn} />
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="v3-divider" aria-hidden="true" />

        {/* Section II: 情景案例工法拆解 (Hypothetical Builder Case Studies) */}
        <section className="about-section" aria-labelledby="cases-title">
          <header className="about-section__head">
            <p className="about-section__label">— II · 情景案例</p>
            <h2 className="about-section__title" id="cases-title">
              <T zh="情景案例工法拆解：把方法放进具体工作流" en="Hypothetical Workflows: Applying the Methods in Context" />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="monthly-cases-list">
            {issue.caseStudies.map((cs) => (
              <article key={cs.id} className="monthly-case-card">
                <div className="monthly-case-card__header">
                  <span className="monthly-case-card__tag">
                    <T zh={cs.tag} en={cs.tagEn} />
                  </span>
                  <span className="monthly-case-card__role">
                    <T zh={cs.role} en={cs.roleEn} />
                  </span>
                </div>

                <h3 className="monthly-case-card__title">
                  <T zh={cs.title} en={cs.titleEn} />
                </h3>

                <div className="monthly-case-card__block">
                  <span className="monthly-case-card__label">
                    <T zh="情景痛点" en="Scenario" />
                  </span>
                  <p>
                    <T zh={cs.challenge} en={cs.challengeEn} />
                  </p>
                </div>

                <div className="monthly-case-card__block">
                  <span className="monthly-case-card__label">
                    <T zh="Kimi 工法解法" en="Solution" />
                  </span>
                  <p>
                    <T zh={cs.solution} en={cs.solutionEn} />
                  </p>
                </div>

                <div className="monthly-case-card__takeaways">
                  <span className="monthly-case-card__label">
                    <T zh="核心启示" en="Key Takeaways" />
                  </span>
                  <ul>
                    {cs.takeaways.map((item, i) => (
                      <li key={i} lang="zh">
                        {item}
                      </li>
                    ))}
                    {cs.takeawaysEn.map((item, i) => (
                      <li key={`en-${i}`} lang="en">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="v3-divider" aria-hidden="true" />

        {/* Section III: 即插即用工法资产包 (Artifacts & Prompts) */}
        <section className="about-section" aria-labelledby="prompts-title">
          <header className="about-section__head">
            <p className="about-section__label">— III · 即插即用资产包</p>
            <h2 className="about-section__title" id="prompts-title">
              <T zh="开箱即用工法资产：一键复制的高阶 Prompt" en="Ready-to-Use Artifacts: Production-Grade Prompts" />
              <span className="stop">.</span>
            </h2>
          </header>

          <p className="monthly-section-intro">
            <T
              zh="拒绝没有约束的泛泛指令。以下提示词均带有严格的认知角色、执行协议、防御性红线与验收标准，可直接复制至 Kimi 对应模式下运行："
              en="No vague one-liners. The following prompt specs carry strict role framing, execution protocols, defensive guardrails, and acceptance assertions:"
            />
          </p>

          <div className="monthly-prompts-grid">
            {issue.artifacts.map((item) => (
              <div key={item.id} className="monthly-prompt-card">
                <div className="monthly-prompt-card__meta">
                  <span className="monthly-prompt-card__badge">
                    <T zh={`工法 · ${item.category}`} en={`Method · ${item.categoryEn}`} />
                  </span>
                  <span className="monthly-prompt-card__mode">
                    <T zh={`推荐模式: ${item.bestMode}`} en={`Mode: ${item.bestMode}`} />
                  </span>
                </div>

                <h3 className="monthly-prompt-card__title">
                  <T zh={item.title} en={item.titleEn} />
                </h3>

                <p className="monthly-prompt-card__desc">
                  <T zh={item.description} en={item.descriptionEn} />
                </p>

                <div className="monthly-prompt-card__body">
                  <pre>
                    <code>{item.prompt}</code>
                  </pre>
                </div>

                <div className="monthly-prompt-card__foot">
                  <CopyPromptButton prompt={item.prompt} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="v3-divider" aria-hidden="true" />

        {/* Section IV: 前沿工具与取舍审计 (No-Hype Audit) */}
        <section className="about-section" aria-labelledby="audit-title">
          <header className="about-section__head">
            <p className="about-section__label">— IV · 避坑与取舍审计</p>
            <h2 className="about-section__title" id="audit-title">
              <T zh={issue.audit.title} en={issue.audit.titleEn} />
              <span className="stop">.</span>
            </h2>
          </header>

          <p className="monthly-section-intro">
            <T zh={issue.audit.summary} en={issue.audit.summaryEn} />
          </p>

          <div className="v3-table-wrap">
            <table className="v3-table">
              <thead>
                <tr>
                  <th>
                    <T zh="对比维度" en="Dimension" />
                  </th>
                  <th>
                    <T zh="推荐场景（该怎么用）" en="Best Practice" />
                  </th>
                  <th>
                    <T zh="真实代价与边界（别怎么用）" en="Trade-off & Constraint" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {issue.audit.comparison.map((row, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>
                        <T zh={row.dimension} en={row.dimensionEn} />
                      </strong>
                    </td>
                    <td>
                      <T zh={row.recommendation} en={row.recommendationEn} />
                    </td>
                    <td>
                      <T zh={row.tradeoff} en={row.tradeoffEn} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="monthly-golden-rule">
            <span className="monthly-golden-rule__label">
              <T zh="本月核心铁律" en="Golden Rule" />
            </span>
            <p className="monthly-golden-rule__text">
              <T zh={issue.audit.goldenRule} en={issue.audit.goldenRuleEn} />
            </p>
          </div>
        </section>

        <div className="v3-divider" aria-hidden="true" />

        {/* Section V: 社区共创与投稿通道 (Community Call for Papers) */}
        <section className="about-section" aria-labelledby="community-title">
          <header className="about-section__head">
            <p className="about-section__label">— V · 社区共创</p>
            <h2 className="about-section__title" id="community-title">
              <T zh="提交你的实战工法与案例" en="Call for Builders: Share Your Workflows" />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="prose">
            <p lang="zh">
              《Kimi Builders 月刊》是一个开源共创的实战生态。如果你在用 AI 学习、思考、构建、业务转型或日常生活协同中沉淀了行之有效的工作流、Prompt 模板或落地案例，欢迎向我们投稿。
            </p>
            <p lang="en">
              The Kimi Builders Monthly is an open, co-created ecosystem. If you have engineered high-leverage workflows, prompt templates, or case studies across learning, thinking, building, or transformation, submit them to be featured.
            </p>
            <p lang="zh">
              入选案例将署名登载于月刊与全书实战工法库，并在全网海报与小程序中进行推荐。你可以直接在下方评论区分享你的工法，或通过 GitHub 提交 PR / 发送邮件至 <code>hi@zhaphar.com</code>。
            </p>
            <p lang="en">
              Selected cases are published with full attribution in the monthly digest, cookbook, and share posters. Share your workflows in the comments below or submit a PR via GitHub.
            </p>
          </div>

          <div className="about-routes">
            <div className="about-routes__row">
              <h3>
                <T zh="GitHub 贡献" en="GitHub PR" />
              </h3>
              <p>
                <T zh="在 content/books/ 下直接提交工法 PR 或开 Issue 讨论。" en="Submit PRs or issues directly on GitHub." />
              </p>
              <a href="https://github.com/aklmans/kimi-cookbook">
                <T zh="前往仓库 →" en="Open Repo →" />
              </a>
            </div>
            <div className="about-routes__row">
              <h3>
                <T zh="阅读全书" en="Read Cookbook" />
              </h3>
              <p>
                <T zh="查阅 10 章完整的 Kimi 模型、四模式、Agent 与 API 技术架构。" en="Dive into the 10-chapter technical deep dive on Kimi." />
              </p>
              <Link href="/books/kimi">
                <T zh="打开全书 →" en="Open Book →" />
              </Link>
            </div>
            <div className="about-routes__row">
              <h3>
                <T zh="RSS 订阅" en="RSS Feed" />
              </h3>
              <p>
                <T zh="不追逐无谓的日更。每月第一天更新，订阅 feed 及时接收。" en="Zero spam. Published on the 1st of every month." />
              </p>
              <a href="/feed.xml">feed.xml</a>
            </div>
          </div>
        </section>

        <Kicker
          zh={"不当代码的打工者,\n做自己业务的指挥官"}
          en={"Do not work for the syntax;\ncommand the intelligence"}
          sig={`Kimi Cookbook Editorial · ${SITE_YEAR}`}
        />

        <Discussion />
      </main>
      <SiteFooter />
    </>
  );
}
