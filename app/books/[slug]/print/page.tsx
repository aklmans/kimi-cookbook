import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { ZHAPHAR_CODE_THEMES } from "@/lib/code-theme";
import rehypeCodeTitle from "@/lib/rehype-code-title";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { notFound } from "next/navigation";
import {
  getAllBooks,
  getBook,
  chapterNumber,
} from "@/lib/books";
import { getMdxComponents, type Reference } from "@/components/mdx";
import { DraftNotice } from "@/components/mdx/DraftNotice";
import { formatReadTime } from "@/lib/format";
import QRCode from "qrcode";
import { T } from "@/components/T";
import { SITE_URL } from "@/lib/site";
import { AssetFrame } from "@/components/AssetFrame";
import { publicAssetExists } from "@/lib/public-assets";
import { bookPrintCover, bookPrintBackCover } from "@/lib/cover-art";
import { PrintTrigger } from "./PrintTrigger";

/* Single-document print route for a whole book.
   Source: composition of book.html (front matter + TOC) + every
   chapter.html. Rendered into one static page so window.print() and
   Playwright `page.pdf()` capture the whole book as one PDF. */
export const dynamicParams = false;

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
  return {
    title: { absolute: `${book.title} · 印刷版` },
    robots: { index: false, follow: false },
  };
}

export default async function PrintBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();
  const coverAvailable = publicAssetExists(book.cover);
  // Library catalogue number for the cover masthead (1-based position among
  // published books, zero-padded — "NO. 03").
  const serial = String(
    getAllBooks().findIndex((b) => b.slug === book.slug) + 1,
  ).padStart(2, "0");

  // Site QR for the back cover — encodes this book's web page so a reader can
  // scan the printed PDF straight to the live, always-current edition. Rendered
  // as an inline SVG server-side (no external request) to keep the PDF
  // self-contained; the QR module colour is our ink on white for scannability.
  const bookWebUrl = `${SITE_URL}/books/${book.slug}`;
  const qrSvg = await QRCode.toString(bookWebUrl, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1A1A1A", light: "#FFFFFF" },
  });

  const chapters = await Promise.all(
    book.chapters.map(async (chapter, index) => {
      // Draft chapter — emit the placeholder; skip the MDX file read
      // and compile so the PDF still has the chapter cover + a clear
      // notice in place of the body.
      if (chapter.draft) {
        return {
          chapter,
          index,
          chars: 0,
          content: (
            <DraftNotice chapter={chapter} number={chapterNumber(index)} />
          ),
        };
      }

      const filePath = path.join(
        process.cwd(),
        "content",
        "books",
        slug,
        "chapters",
        `${chapter.slug}.mdx`,
      );

      // Surface render failures instead of silently dropping the
      // chapter. A null return here used to produce a 200 PDF that was
      // quietly missing a chapter; build-pdfs.mjs only checks HTTP
      // status, so the only way to stop a bad PDF is to make this route
      // 500. Log the book + chapter slug first so the server log points
      // straight at the broken file, then re-throw.
      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const { data, content: body } = matter(raw);
        // CJK character count for the "字数" stat on the covers. Counting Han
        // characters in the raw MDX body isolates the Chinese content (the en
        // strings in <T en="…"> are Latin), so it stands in for the book's
        // length without parsing the bilingual component tree.
        const chars = (body.match(/[一-鿿㐀-䶿]/g) ?? []).length;
        const references: Reference[] = Array.isArray(data.references)
          ? (data.references as Reference[])
          : [];

        const { content } = await compileMDX({
          source: body,
          components: getMdxComponents({
            book,
            chapter,
            number: chapterNumber(index),
            references,
          }),
          options: {
            blockJS: false,
            mdxOptions: {
              remarkPlugins: [remarkGfm],
              rehypePlugins: [
                [
                  rehypePrettyCode,
                  {
                    theme: ZHAPHAR_CODE_THEMES,
                    keepBackground: false,
                  },
                ],
                rehypeCodeTitle,
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: "wrap" }],
              ],
            },
          },
        });

        return { chapter, index, chars, content };
      } catch (error) {
        console.error(
          `[print] Failed to render ${book.slug}/${chapter.slug}`,
          error,
        );
        throw error;
      }
    }),
  );

  // Whole-book CJK length for the "字数" stat on the front + back covers.
  const charCount = chapters.reduce((sum, c) => sum + c.chars, 0);

  return (
    <>
      <PrintTrigger />
      <main className="print-book" id="main">
        {/* Front matter — cover. The full-bleed editorial title page
            (masthead + mark + title + lede + colophon) is composed inside
            the cover art itself; no separate meta column. */}
        <section className="print-cover">
          <div className="print-cover__inner">
            <AssetFrame
              className="print-cover__art"
              src={book.cover}
              available={coverAvailable}
              alt={`${book.title} / ${book.titleEn} cover`}
              fallback={bookPrintCover(book, serial, charCount)}
              fit="cover"
              sizes="360px"
              priority
            />
          </div>
        </section>

        {/* Front matter — TOC */}
        <section className="print-toc">
          <h2 className="print-toc__title">
            <T zh="目录" en="Table of Contents" />
            <span className="stop">.</span>
          </h2>
          <ol className="print-toc__list">
            {book.chapters.map((c, i) => (
              <li className="print-toc__item" key={c.slug}>
                {/* Same-document fragment link → Chromium's page.pdf()
                    emits a clickable GoTo annotation that jumps to the
                    chapter's page. Target id sits on the chapter
                    <article> below. */}
                <a className="print-toc__link" href={`#chapter-${c.slug}`}>
                  <span className="print-toc__num">{chapterNumber(i)}</span>
                  <span className="print-toc__title-cell">
                    <T zh={c.title} en={c.titleEn} />
                  </span>
                  <span className="print-toc__time">
                    <T
                      zh={formatReadTime(c.readTime, "zh")}
                      en={formatReadTime(c.readTime, "en")}
                    />
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        {/* Chapters — each .v3-cover already breaks before via v3.css.
            A failed non-draft chapter now throws at render time (see
            the per-chapter try above) so this route 500s instead of
            silently shipping a PDF missing a chapter. */}
        {chapters.map((entry) => (
          <article
            className="print-chapter"
            id={`chapter-${entry.chapter.slug}`}
            key={entry.chapter.slug}
          >
            {entry.content}
          </article>
        ))}

        {/* Back matter — the book's closing back-cover */}
        {bookPrintBackCover(book, { qrSvg, siteUrl: SITE_URL, charCount })}
      </main>
    </>
  );
}
