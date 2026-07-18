import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { T } from "@/components/T";
import { Kicker } from "@/components/mdx/structure";
import { NotFoundTracker } from "@/components/NotFoundTracker";

export const metadata: Metadata = {
  title: { absolute: "404 · Kimi" },
};

/* 404 — source: 404.html (README §still-to-do → app/not-found.tsx) */
export default function NotFound() {
  return (
    <>
      <NotFoundTracker />
      <SiteHeader />
      <main className="v3-page" id="main">
        <section className="nf">
          <div className="nf__inner">
            <p className="nf__eyebrow">
              — 404 · <T zh="没有这一页" en="Not Found" />
            </p>
            <h1 className="nf__title">
              <T
                zh="这一页还没写出来"
                en="This page hasn't been written"
              />
              <span className="stop">.</span>
            </h1>
            <p className="nf__lede">
              <T
                zh="也许它正在被起草, 也许它已经搬走了, 也许是地址抄错了。回到这本书, 十章都已经写完在那里等你。"
                en="Maybe it's still being drafted. Maybe it moved. Maybe the URL was mistyped. Head back to the book — all ten chapters are finished and waiting."
              />
            </p>
            <hr className="nf__rule" />
            <div className="nf__actions">
              <Link className="nf__btn" href="/">
                ← <T zh="回首页" en="Back to Home" />
              </Link>
              <Link className="nf__btn" href="/books/kimi">
                <T zh="看看这本书 →" en="Read the Book →" />
              </Link>
            </div>
          </div>
        </section>

        <Kicker
          zh={"没找到的东西,\n有时候比找到的东西\n更值得记住"}
          en={"What you didn't find\nsometimes matters more\nthan what you did"}
        />
      </main>
      <SiteFooter />
    </>
  );
}
