import type { Metadata } from "next";
import type { CSSProperties } from "react";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { T } from "@/components/T";
import {
  getAllBooks,
  getBook,
  bookDateShort,
  chapterNumber,
} from "@/lib/books";
import { formatReadTime } from "@/lib/format";
import { tagsZh, tagsEn } from "@/lib/labels";
import { absoluteUrl } from "@/lib/site";
import { bookCoverMark } from "@/lib/cover-art";
import { coverBrandForBook } from "@/lib/cover-brand";
import { coverVisualFor } from "@/lib/cover-visual";
import { CoverVisual } from "@/components/CoverVisual";
import { AgentReaderButton } from "@/components/AgentReaderButton";
import { BookTracker } from "./BookTracker";
import { PdfDownloadLink } from "./PdfDownloadLink";

/* Book detail / table of contents — source: book.html */

export const dynamicParams = false;

/* If `npm run pdf` has produced a static PDF, link the download
   button at it directly; otherwise fall back to the in-browser
   `/print?print=1` route. Checked at build time, so the static
   page is baked with the right href. */
function hasStaticPdfFile(fileName: string): boolean {
  try {
    return fs.statSync(
      path.join(process.cwd(), "public", "books", fileName),
    ).isFile();
  } catch {
    return false;
  }
}

export function generateStaticParams() {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) return {};
  const url = `/books/${slug}`;
  return {
    title: { absolute: book.title },
    description: book.description,
    alternates: {
      canonical: url,
      // Machine discovery for AI readers: the whole-book markdown lives
      // at /books/<slug>/llms.md (chapter-level twins sit on each
      // chapter page's own alternates).
      types: { "text/markdown": `${url}/llms.md` },
    },
    openGraph: {
      type: "book",
      title: book.title,
      description: book.description,
      url: absoluteUrl(url),
      siteName: "Kimi Cookbook",
      authors: [book.author],
    },
    twitter: {
      card: "summary_large_image",
      title: book.title,
      description: book.description,
      creator: "@ak_zhaphar",
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();

  const firstChapter = book.chapters[0];
  const pdfHref = hasStaticPdfFile(`${slug}.pdf`)
    ? `/books/${slug}.pdf`
    : `/books/${slug}/print?print=1&lang=zh`;
  const pdfHrefEn =
    book.language === "zh-en"
      ? hasStaticPdfFile(`${slug}.en.pdf`)
        ? `/books/${slug}.en.pdf`
        : `/books/${slug}/print?print=1&lang=en`
      : pdfHref;

  return (
    <>
      <BookTracker slug={slug} />
      <SiteHeader />
      <main className="v3-page" id="main">
        {/* Hero */}
        <section className="book-detail">
          {/* Cover card first in the DOM so it can float top-right on mobile
              (text wraps beside it); on desktop it's pinned to the right column
              via grid-column, so source order doesn't matter there. */}
          <aside className="book-detail__aside" aria-hidden="true">
            <div
              className="cover-card"
              style={
                {
                  "--cover-accent": coverBrandForBook(book).accent,
                  "--cover-logo-color": coverBrandForBook(book).accent,
                } as CSSProperties
              }
            >
              <div className="cover-card__art">
                <CoverVisual
                  motif={coverVisualFor(book.slug).motif}
                  variant={coverVisualFor(book.slug).variant}
                  style={coverVisualFor(book.slug).style}
                />
              </div>
            </div>
          </aside>
          <div className="book-detail__main">
          {/* Left column: brand mark, the text once, a colophon of facts +
              actions. */}
          {bookCoverMark(book)}
          <p className="book-detail__eyebrow">
            — <T zh={tagsZh(book.tags)} en={tagsEn(book.tags)} />
          </p>
          <h1 className="book-detail__title">
            <T
              zh={book.coverTitle || book.title}
              en={book.coverTitleEn || book.titleEn}
            />
            <span className="stop">.</span>
          </h1>
          {/* Short focused lede; the full `description` still ships in
              OG / Twitter / RSS / search (see generateMetadata). */}
          <p className="book-detail__lede">
            <T
              zh={book.lede || book.description}
              en={book.ledeEn || book.descriptionEn}
            />
          </p>
          {book.language === "zh" && (
            /* Visible only in EN mode — the verbatim v3.css
               `:root[data-lang="zh"] [lang="en"]` rule hides this span when
               the site is in Chinese. Tells EN readers the book body is
               still Chinese so they understand the chapters stay Chinese. */
            <p
              lang="en"
              data-i18n-lang="en"
              className="book-detail__lang-note"
            >
              — This book is currently available in Chinese only.
            </p>
          )}
          {/* Colophon: facts + actions grouped under a hairline. */}
          <div className="book-detail__foot">
            <dl className="book-detail__stats">
              <div className="book-detail__stat">
                <dt>
                  <T zh="章节" en="Chapters" />
                </dt>
                <dd>{book.chapters.length}</dd>
              </div>
              <div className="book-detail__stat">
                <dt>
                  <T zh="更新" en="Updated" />
                </dt>
                <dd>{bookDateShort(book.date)}</dd>
              </div>
              <div className="book-detail__stat">
                <dt>
                  <T zh="作者" en="Author" />
                </dt>
                <dd>{book.author}</dd>
              </div>
            </dl>
            <div className="book-detail__actions">
              <Link
                className="book-detail__btn book-detail__btn--primary"
                href={`/books/${book.slug}/${firstChapter.slug}`}
              >
                <T zh="开始阅读 →" en="Start Reading →" />
              </Link>
              <PdfDownloadLink slug={slug} href={pdfHref} hrefEn={pdfHrefEn}>
                <T zh="下载 PDF ↓" en="Download PDF ↓" />
              </PdfDownloadLink>
              <AgentReaderButton slug={book.slug} />
            </div>
          </div>
          </div>
        </section>

        <div className="v3-divider" aria-hidden="true" />

        {/* TOC */}
        <header className="section-head">
          <p className="section-head__label">— <T zh="目录" en="Table of Contents" /></p>
          <h2 className="section-head__title">
            <T zh="目录" en="Table of Contents" />
            <span className="stop">.</span>
          </h2>
        </header>

        <nav className="toc" aria-label="目录 / Table of contents">
          {book.chapters.map((c, i) => (
            <Link
              className={`toc__row${c.draft ? " toc__row--draft" : ""}`}
              href={`/books/${book.slug}/${c.slug}`}
              key={c.slug}
            >
              <span className="toc__num">{chapterNumber(i)}</span>
              <span className="toc__title">
                <T zh={c.title} en={c.titleEn} />
              </span>
              <span className="toc__time">
                {c.draft ? (
                  <T zh="草稿" en="DRAFT" />
                ) : (
                  <T
                    zh={formatReadTime(c.readTime, "zh")}
                    en={formatReadTime(c.readTime, "en")}
                  />
                )}
              </span>
            </Link>
          ))}
        </nav>

      </main>
      <SiteFooter />
    </>
  );
}
