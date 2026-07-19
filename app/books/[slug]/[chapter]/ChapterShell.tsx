import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ChapterNavData } from "@/components/ChapterNavData";
import { ChapterOutline } from "@/components/ChapterOutline";
import { Discussion } from "@/components/Discussion";
import { T } from "@/components/T";
import { NextBook } from "@/components/mdx/NextBook";
import { ChapterAgentButton } from "@/components/ChapterAgentButton";
import { getBook, getPreviousBook, chapterNumber, commentsMode } from "@/lib/books";
import { formatReadTime } from "@/lib/format";
import type { BookMeta, Chapter } from "@/lib/types";
import type { ChapterOutlineItem } from "@/lib/chapter-outline";
import { ChapterTracker } from "./ChapterTracker";
import { ChapterIndexMenu, type ChapterIndexItem } from "./ChapterIndexMenu";

/* The frame around a chapter's MDX body: progress bar, header,
   chapter nav + hover TOC popover, next-book card, discussion, footer. */
export function ChapterShell({
  book,
  chapter,
  index,
  outline = [],
  children,
}: {
  book: BookMeta;
  chapter: Chapter;
  index: number;
  outline?: ChapterOutlineItem[];
  children: ReactNode;
}) {
  const total = book.chapters.length;
  const number = chapterNumber(index);
  const href = (c: Chapter) => `/books/${book.slug}/${c.slug}`;
  const prev = index > 0 ? book.chapters[index - 1] : null;
  const next = index < total - 1 ? book.chapters[index + 1] : null;
  const nextBook =
    chapter.isLastChapter && book.nextBook ? getBook(book.nextBook) : null;
  const previousBook = chapter.isLastChapter ? getPreviousBook(book.slug) : null;
  const comments = commentsMode(book, chapter);

  const tocItems: ChapterIndexItem[] = book.chapters.map((c, i) => ({
    key: c.slug,
    num: chapterNumber(i),
    title: <T zh={c.title} en={c.titleEn} />,
    time: (
      <T
        zh={formatReadTime(c.readTime, "zh")}
        en={formatReadTime(c.readTime, "en")}
      />
    ),
    href: href(c),
    isCurrent: i === index,
  }));

  return (
    <>
      <ChapterTracker bookSlug={book.slug} chapterSlug={chapter.slug} />
      <ReadingProgress progressKey={`${book.slug}/${chapter.slug}`} />
      <ChapterNavData
        prev={prev ? href(prev) : undefined}
        next={next ? href(next) : undefined}
        first={href(book.chapters[0])}
        last={href(book.chapters[total - 1])}
      />
      <SiteHeader backHref={`/books/${book.slug}`} />
      <ChapterOutline items={outline} />

      <main className="v3-page ch-page" id="main">
        {book.language === "zh" && (
          <div lang="en" data-i18n-lang="en" className="ch-lang-notice">
            <p>
              This chapter is available in <strong>Chinese only</strong>.
              The content below has not been translated.
            </p>
          </div>
        )}
        {children}

        {/* Per-chapter Feed-to-AI entry — copies the chapter-scoped
            prompt (see ChapterAgentButton). */}
        <ChapterAgentButton
          bookSlug={book.slug}
          bookTitle={book.title}
          number={number}
          chapterSlug={chapter.slug}
          chapterTitle={chapter.title}
          lede={chapter.lede}
        />

        {/* Chapter nav */}
        <nav className="ch-nav" aria-label="章节导航 / Chapter navigation">
          <div className="ch-nav__meta">
            <span className="ch-nav__series">
              <T zh="本书目录" en="In This Book" />
            </span>
            <ChapterIndexMenu
              number={number}
              total={String(total).padStart(2, "0")}
              bookHref={`/books/${book.slug}`}
              label={<T zh="本书目录" en="In This Book" />}
              footLabel={<T zh="查看完整目录 →" en="View full index →" />}
              items={tocItems}
            />
          </div>

          <div className="ch-nav__links">
            {prev ? (
              <Link
                className="ch-nav__link ch-nav__link--prev"
                href={href(prev)}
                rel="prev"
              >
                <span className="ch-nav__dir">
                  ← <T zh="上一章" en="Previous" />
                </span>
                <span className="ch-nav__title">
                  <T
                    zh={prev.titleShort ?? prev.title}
                    en={prev.titleShortEn ?? prev.titleEn}
                  />
                </span>
              </Link>
            ) : (
              <span className="ch-nav__link is-empty" aria-hidden="true" />
            )}

            {next ? (
              <Link
                className="ch-nav__link ch-nav__link--next"
                href={href(next)}
                rel="next"
              >
                <span className="ch-nav__dir">
                  <T zh="下一章" en="Next" /> →
                </span>
                <span className="ch-nav__title">
                  <T
                    zh={next.titleShort ?? next.title}
                    en={next.titleShortEn ?? next.titleEn}
                  />
                </span>
              </Link>
            ) : (
              <span className="ch-nav__link is-empty" aria-hidden="true" />
            )}
          </div>
        </nav>

        {nextBook && <NextBook book={nextBook} previousBook={previousBook} />}

        {comments !== "hidden" && <Discussion closed={comments === "disabled"} />}
      </main>

      <SiteFooter />
    </>
  );
}
