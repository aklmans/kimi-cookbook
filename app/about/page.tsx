import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTracker } from "@/components/PageTracker";
import { Discussion } from "@/components/Discussion";
import { T } from "@/components/T";
import { Kicker } from "@/components/mdx/structure";
import { SITE_YEAR } from "@/lib/site";

export const metadata: Metadata = {
  title: "About the Book",
  description:
    "《Kimi · 从长文本到一套 agent 栈》—— Zhapar 写给已经付费 Kimi、却只用到一小部分的人: 每块产品干什么、买哪档够用、什么时候回 frontier。",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: "About the Book · Kimi",
    description:
      "《Kimi · 从长文本到一套 agent 栈》—— Zhapar 写给已经付费 Kimi、却只用到一小部分的人。",
    url: "/about",
    siteName: "Kimi Cookbook",
  },
};

/* About — single-book edition: what this book is, who wrote it, how to read it. */
export default function AboutPage() {
  return (
    <>
      <PageTracker pageSlug="about" />
      <SiteHeader />
      <main className="v3-page about-page" id="main">
        <section className="about-library" aria-labelledby="about-title">
          <div className="about-library__copy">
            <p className="about-library__eyebrow">
              — <T zh="关于本书" en="About the Book" />
            </p>
            <h1 className="about-library__title" id="about-title">
              <T zh="关于本书" en="About the Book" />
              <span className="stop">.</span>
            </h1>
            <p className="about-library__lede">
              <T
                zh="一本讲透 Kimi 的书, 和一个写字的人。"
                en="One book that maps the Kimi stack, and the person who wrote it."
              />
            </p>
            <p className="about-library__byline">
              <T
                zh={`Kimi · 从长文本到一套 agent 栈 · Zhapar · ${SITE_YEAR}`}
                en={`Kimi · From Long Context to an Agent Stack · Zhapar · ${SITE_YEAR}`}
              />
            </p>
            <hr className="about-library__rule" />
            <div className="about-library__intro">
              <p lang="zh">
                很多人对 Kimi 的印象还停在「长文本」那一年 —— 一次吃几万字、中文写得稳。
                那是它的旧定位。到 K3, 它长成一套对标 OpenAI / Anthropic 的 agent 栈:
                四模式、做出成品的 Agent、上百子 agent 的 Swarm、Deep Research、
                跑在终端的 Kimi Code, 和一套双兼容的 API。这本书给这套栈画张图。
              </p>
              <p lang="en">
                Most people still remember Kimi as the long-context tool. That is
                its old job description. With K3 it has grown into an agent stack
                comparable to OpenAI and Anthropic: four modes, an Agent that ships
                finished artifacts, a Swarm of sub-agents, Deep Research, Kimi Code
                in the terminal, and a dual-compatible API. This book maps that stack.
              </p>
            </div>
          </div>

          <aside
            className="about-library__aside"
            aria-label="Book facts"
          >
            <dl className="about-facts">
              <div className="about-facts__row">
                <dt>
                  <T zh="读者" en="Reader" />
                </dt>
                <dd>
                  <T
                    zh="已付费 Kimi · 用得浅"
                    en="Paying for Kimi · underusing it"
                  />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="方法" en="Method" />
                </dt>
                <dd>
                  <T
                    zh="判断 · 边界 · 取舍"
                    en="Judgment · boundaries · trade-offs"
                  />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="形态" en="Format" />
                </dt>
                <dd>
                  <T
                    zh="在线 · PDF · llms.md"
                    en="Online · PDF · llms.md"
                  />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="语言" en="Language" />
                </dt>
                <dd>
                  <T zh="中文" en="Chinese" />
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="订阅" en="Subscribe" />
                </dt>
                <dd>
                  <a href="/feed.xml">RSS</a>
                </dd>
              </div>
              <div className="about-facts__row">
                <dt>
                  <T zh="授权" en="License" />
                </dt>
                <dd>
                  <a href="/license">CC BY-NC-ND 4.0</a>
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="about-section" aria-labelledby="about-what-title">
          <header className="about-section__head">
            <p className="about-section__label">— I</p>
            <h2 className="about-section__title" id="about-what-title">
              <T zh="为什么写这本书" en="Why This Book" />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="prose">
            <p lang="zh">
              产品页会告诉你 Kimi 能做什么, 但很少告诉你这件功能值不值得花十分钟学。
              一份会员打开的入口越来越多: 聊天框、四种模式、Agent、Agent 集群、
              Deep Research、Kimi Code、开放平台 API。问题不再是「有没有功能」,
              而是「这件活该从哪一面开始」。
            </p>
            <p lang="en">
              The product page tells you what Kimi can do, but rarely whether a
              feature is worth ten minutes of your attention. One membership now
              opens many entrances: the chat box, four modes, Agent, Agent Swarm,
              Deep Research, Kimi Code, and the platform API. The question is no
              longer whether a feature exists — it is which surface a piece of
              work should start from.
            </p>
            <p lang="zh">
              这本书只解决一类判断: Kimi 的每一面对标前沿的哪一个、买哪档够用、
              什么活该交给它、什么时候该回 frontier。读完以后, 你应该能去做一件事,
              或者放心不做一件事。
            </p>
            <p lang="en">
              This book resolves one kind of judgment: which frontier product each
              Kimi surface matches, which tier is enough, what work to hand it, and
              when to go back to the frontier. After reading, you should be able to
              do one thing, or confidently not do one thing.
            </p>
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-works-title">
          <header className="about-section__head">
            <p className="about-section__label">— II</p>
            <h2 className="about-section__title" id="about-works-title">
              <T zh="这本书写什么" en="What It Covers" />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="prose">
            <p lang="zh">
              十章, 从全景到取舍: 先给整套栈画张图, 再逐面讲清 —— K3、K2.7-Code
              与 K2.6 三颗脑子怎么分工; Instant / Thinking / Agent / Agent Swarm
              四个模式怎么挑; Agent 什么时候能直接做出成品; 大活该不该动用集群;
              Deep Research 什么活值得等; Kimi Code 与双兼容 API 怎么接进你的工具链。
            </p>
            <p lang="en">
              Ten chapters, from the big picture to the trade-offs: first a map of
              the whole stack, then each surface in turn — how K3, K2.7-Code, and
              K2.6 split the work; how to pick among Instant, Thinking, Agent, and
              Agent Swarm; when Agent ships a finished artifact; when a job earns
              the swarm; what Deep Research is worth waiting for; and how Kimi Code
              and the dual-compatible API plug into your toolchain.
            </p>
            <p lang="zh">
              最后两章收束成判断: 五档会员摆开, 说清订阅不含 API, 什么活该回
              Claude / GPT、什么活交给 DeepSeek; 再用一张速查表, 把常见的活对到
              该用的那一面。厂商自评与独立实测, 分开算账。
            </p>
            <p lang="en">
              The last two chapters fold it into judgment: the five membership
              tiers, the fact that the subscription excludes API usage, what work
              belongs back on Claude / GPT, and what belongs to DeepSeek — then a
              cheat sheet mapping common jobs to the right surface. Vendor claims
              and independent benchmarks are counted separately.
            </p>
          </div>
        </section>

        <section className="about-section" aria-labelledby="about-reading-title">
          <header className="about-section__head">
            <p className="about-section__label">— III</p>
            <h2 className="about-section__title" id="about-reading-title">
              <T zh="怎么读" en="How to Read It" />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="about-routes">
            <div className="about-routes__row">
              <h3>
                <T zh="在线读" en="Read online" />
              </h3>
              <p>
                <T
                  zh="从引子开始, 或者直接从目录跳到你正卡住的那一章。"
                  en="Start at the intro, or jump from the contents straight to the chapter you are stuck on."
                />
              </p>
              <Link href="/books/kimi">
                <T zh="打开这本书" en="Open the book" />
              </Link>
            </div>
            <div className="about-routes__row">
              <h3>PDF</h3>
              <p>
                <T
                  zh="需要慢读、标注或留档时, 用这本书的打印版。"
                  en="Use the print edition when you need slow reading, annotation, or archiving."
                />
              </p>
              <span>
                <T zh="书页内提供下载" en="Available on the book page" />
              </span>
            </div>
            <div className="about-routes__row">
              <h3>llms.md</h3>
              <p>
                <T
                  zh="这本书有 AI 可读 Markdown。交给自己的 agent, 让它按章节摘读、追问、引用。"
                  en="The book ships AI-readable Markdown. Give it to your own agent for chapter summaries, follow-up questions, and citations."
                />
              </p>
              <span>/books/kimi/llms.md</span>
            </div>
            <div className="about-routes__row">
              <h3>RSS</h3>
              <p>
                <T
                  zh="这里不追日更。只想知道下一章什么时候出现, 订阅 feed 就够了。"
                  en="This is not a daily feed. If you only want to know when the next chapter lands, subscribe to the feed."
                />
              </p>
              <a href="/feed.xml">feed.xml</a>
            </div>
          </div>
        </section>

        <div className="v3-divider" aria-hidden="true" />

        <section className="about-section" aria-labelledby="about-author-title">
          <header className="about-section__head">
            <p className="about-section__label">— IV</p>
            <h2 className="about-section__title" id="about-author-title">
              <T zh="作者与边界" en="Author & Boundaries" />
              <span className="stop">.</span>
            </h2>
          </header>

          <div className="about-colophon">
            <div className="prose">
              <p lang="zh">
                这本书由 Zhapar 撰写与维护。作者写代码, 也写字, 长期关心的是工具怎样进入
                真实工作, 而不是发布当天的漂亮话。这里默认站在付费用户一侧: 可以推荐,
                但要说清为什么; 可以喜欢一个产品, 也必须写它的 trade-off。
              </p>
              <p lang="en">
                The book is written and maintained by Zhapar, a writer and engineer
                more interested in how tools enter real work than in launch-day
                polish. The default side is the paying user: recommendations need
                reasons; affection for a product still has to include its trade-offs.
              </p>
              <p lang="zh">
                这里不做 affiliate 排序, 不夹带课程软广, 不为了新模型发布重写整本书。
                大改版会补边注, 判断变了会开新章。读到哪一章想说点什么,
                章末和本页末尾都有评论区, 也可以直接发邮件。
              </p>
              <p lang="en">
                There are no affiliate rankings, no course tie-ins, and no full
                rewrites just because a new model ships. Major redesigns get notes;
                changed judgments become new chapters. If you have something to
                say, comments live at the end of chapters and this page, or you
                can email directly.
              </p>
            </div>

            <div className="elsewhere">
              <div className="elsewhere__row">
                <span className="elsewhere__label">Twitter / X</span>
                <span className="elsewhere__value">
                  <a href="https://x.com/ak_zhaphar">@ak_zhaphar</a>
                </span>
              </div>
              <div className="elsewhere__row">
                <span className="elsewhere__label">GitHub</span>
                <span className="elsewhere__value">
                  <a href="https://github.com/aklmans/kimi-cookbook">
                    aklmans/kimi-cookbook
                  </a>
                </span>
              </div>
              <div className="elsewhere__row">
                <span className="elsewhere__label">Email</span>
                <span className="elsewhere__value">
                  <a href="mailto:hi@zhaphar.com">hi@zhaphar.com</a>
                </span>
              </div>
            </div>
          </div>
        </section>

        <Kicker
          zh={"工具替你做事,\n替不了你判断"}
          en={"Tools can do the work,\nnot the judgment"}
          sig={`Zhapar · ${SITE_YEAR}`}
        />

        <Discussion />
      </main>
      <SiteFooter />
    </>
  );
}
