import type { CSSProperties, ReactNode } from "react";
import { BookCoverLogo } from "@/components/BookCoverLogo";
import { CoverArt } from "@/components/CoverArt";
import { CoverVisual } from "@/components/CoverVisual";
import { T } from "@/components/T";
import { coverBrandForBook } from "./cover-brand";
import { coverVisualFor } from "./cover-visual";
import type { BookMeta } from "./types";
import { tagsEn, tagsZh } from "./labels";

export function coverLogoForBook(
  book: Pick<BookMeta, "slug" | "title" | "titleEn">,
): ReactNode {
  const brand = coverBrandForBook(book);
  if (brand.hasLobeIcon) {
    return <BookCoverLogo slug={book.slug} />;
  }

  return <span className="cover-art__brand-mark">{brand.mark}</span>;
}

/** Brand mark for the single-column book-detail title page — the combined
    logo (icon + wordmark, e.g. "A\ ANTHROPIC"), the same lockup the library
    thumbnails use. The wordmark carries the brand name, so the detail
    title (coverTitle) drops the redundant product prefix. Sized via
    `.book-detail__mark` in globals.css; `--cover-logo-color` (the brand
    accent) tints the icon and `--cover-accent` fills tile-backed marks
    (Kimi) — both are set here the same way `CoverArt` sets them for the
    thumbnail / print cover, so the mark renders identically everywhere. */
export function bookCoverMark(book: BookMeta): ReactNode {
  const brand = coverBrandForBook(book);
  return (
    <span
      className="book-detail__mark"
      aria-hidden="true"
      style={
        {
          "--cover-logo-color": brand.accent,
          "--cover-accent": brand.accent,
        } as CSSProperties
      }
    >
      {coverLogoForBook(book)}
    </span>
  );
}

/** Builds a <CoverArt> from a BookMeta — used as the fallback prop
    on every AssetFrame that displays a book cover. */
export function bookCoverArt(book: BookMeta, accent?: string): ReactNode {
  const brand = coverBrandForBook(book);

  return (
    <CoverArt
      title={book.coverTitle || book.title}
      titleEn={book.coverTitleEn || book.titleEn}
      subtitle={book.lede || book.subtitle}
      subtitleEn={book.ledeEn || book.subtitleEn}
      tags={<T zh={tagsZh(book.tags)} en={tagsEn(book.tags)} />}
      logo={coverLogoForBook(book)}
      brand={brand.label}
      accent={accent ?? brand.accent}
    />
  );
}

/** Full-bleed print cover (the A4 PDF first page) — a two-column "jacket" that
    mirrors the web detail hero: a masthead (imprint + serial) pinned top, then
    a body split into a text column (kicker → mark → title → accent rule → lede)
    and the flowing-gradient cover card (`<CoverVisual>`), then a 3-part colophon
    (author / chapters·minutes / year) pinned bottom. All bound by hairlines.
    Styled by the `.print-jacket*` rules in @media print. */
/** Book length for the "字数" stat — the raw CJK character count, formatted.
    zh rounds to 万 (0.1 precision, dropping a trailing .0); en gives a rough
    "≈Nk". Read time was dropped from the covers — it varies too much per reader
    to be worth showing; length is the stable signal. */
function charCountZh(chars: number): string {
  // ≥ 9500 rounds to ≥ 1.0 万 — switch to 万 there so 9881 reads "1 万字",
  // not "10 千字". Below that, round to the nearest 千 (min 1).
  if (chars >= 9500) {
    const wan = Math.round(chars / 1000) / 10;
    return `${Number.isInteger(wan) ? wan : wan.toFixed(1)} 万字`;
  }
  return `${Math.max(1, Math.round(chars / 1000))} 千字`;
}
function charCountEn(chars: number): string {
  return `≈${Math.round(chars / 1000)}k`;
}

export function bookPrintCover(
  book: BookMeta,
  serial: string,
  charCount = 0,
): ReactNode {
  const brand = coverBrandForBook(book);
  const visual = coverVisualFor(book.slug);
  const chapters = book.chapters.length;
  const year = book.date.slice(0, 4);

  return (
    <div
      className="print-jacket"
      aria-hidden="true"
      style={
        {
          "--cover-accent": brand.accent,
          "--cover-logo-color": brand.accent,
        } as CSSProperties
      }
    >
      <div className="print-jacket__masthead">
        <span className="print-jacket__imprint">
          <T zh="KIMI COOKBOOK" en="KIMI COOKBOOK" />
        </span>
        <span className="print-jacket__serial">NO. {serial}</span>
      </div>
      <div className="print-jacket__body">
        <div className="print-jacket__lead">
          <p className="print-jacket__kicker">
            — <T zh={tagsZh(book.tags)} en={tagsEn(book.tags)} />
          </p>
          <div className="print-jacket__mark">{coverLogoForBook(book)}</div>
          <h1 className="print-jacket__title">
            <T
              zh={book.coverTitle || book.title}
              en={book.coverTitleEn || book.titleEn}
            />
          </h1>
          <span className="print-jacket__rule" />
          <p className="print-jacket__lede">
            <T
              zh={book.lede || book.subtitle || ""}
              en={book.ledeEn || book.subtitleEn || book.lede || book.subtitle || ""}
            />
          </p>
        </div>
        <div className="print-jacket__card cover-card">
          <div className="cover-card__art">
            <CoverVisual motif={visual.motif} variant={visual.variant} style={visual.style} />
          </div>
        </div>
      </div>
      <div className="print-jacket__colophon">
        <span>
          <T zh={`作者 ${book.author}`} en={`By ${book.author}`} />
        </span>
        <span>
          <T
            zh={
              charCount > 0
                ? `${chapters} 章 · ${charCountZh(charCount)}`
                : `${chapters} 章`
            }
            en={
              charCount > 0
                ? `${chapters} Ch · ${charCountEn(charCount)}`
                : `${chapters} Ch`
            }
          />
        </span>
        <span>{year}</span>
      </div>
    </div>
  );
}

/* Inline monochrome icons for the back-cover link row + notice. Hand-rolled
   (X and a globe aren't in @lobehub/icons, and a server-rendered print page
   stays simplest fully self-contained). All 24×24, currentColor. */
const BACK_ICON_GLOBE = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.25" />
    <ellipse cx="12" cy="12" rx="4" ry="9.25" />
    <path d="M2.9 12h18.2" />
  </svg>
);
const BACK_ICON_X = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const BACK_ICON_GITHUB = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);
const BACK_ICON_INFO = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 11.2v5.3" strokeLinecap="round" />
    <circle cx="12" cy="7.8" r="0.95" fill="currentColor" stroke="none" />
  </svg>
);

/** Print back-cover — the book's closing colophon page. A structured "back
    matter" composition (no cover art): the brand mark, title + subtitle, then a
    rule, a QR + author-bio row, a read-online notice, the site links, a 4-up
    stat strip (chapters / length / updated / version), and the © + disclaimer.
    `qrSvg` is a pre-rendered inline SVG (generated in the async print route) so
    this stays a sync render; when absent the QR block just doesn't appear.
    Rendered on its own footer-less page via `page: backcover` (Round-90). */
export function bookPrintBackCover(
  book: BookMeta,
  {
    qrSvg,
    siteUrl,
    charCount = 0,
  }: { qrSvg?: string; siteUrl: string; charCount?: number },
): ReactNode {
  const brand = coverBrandForBook(book);
  const chapters = book.chapters.length;
  const year = book.date.slice(0, 4);
  const edition = book.date.slice(0, 7).replace("-", ".");

  const links = [
    { key: "site", icon: BACK_ICON_GLOBE, href: siteUrl, label: "kimi.read.wiki" },
    { key: "x", icon: BACK_ICON_X, href: "https://x.com/ak_zhaphar", label: "x.com/ak_zhaphar" },
    { key: "gh", icon: BACK_ICON_GITHUB, href: "https://github.com/aklmans/kimi-cookbook", label: "github.com/aklmans/kimi-cookbook" },
  ];
  const stats = [
    { key: "ch", label: <T zh="章节" en="Chapters" />, value: String(chapters) },
    {
      key: "len",
      label: <T zh="字数" en="Length" />,
      value: <T zh={charCountZh(charCount)} en={charCountEn(charCount)} />,
    },
    { key: "upd", label: <T zh="更新" en="Updated" />, value: edition },
    { key: "ver", label: <T zh="版本" en="Version" />, value: "PDF 1.0" },
  ];

  return (
    <section
      className="print-backcover"
      style={
        {
          "--cover-accent": brand.accent,
          "--cover-logo-color": brand.accent,
        } as CSSProperties
      }
    >
      <div className="print-backcover__mark">{coverLogoForBook(book)}</div>

      <div className="print-backcover__head">
        <h2 className="print-backcover__title">
          <T
            zh={book.coverTitle || book.title}
            en={book.coverTitleEn || book.titleEn}
          />
          <span className="stop">.</span>
        </h2>
        <p className="print-backcover__subtitle">
          <T
            zh={book.lede || book.subtitle || ""}
            en={
              book.ledeEn || book.subtitleEn || book.lede || book.subtitle || ""
            }
          />
        </p>
      </div>

      <span className="print-backcover__rule" />

      <div className="print-backcover__main">
        {qrSvg ? (
          <div className="print-backcover__qr">
            <span
              className="print-backcover__qr-img"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <span className="print-backcover__qr-cap">
              <T zh="扫码在线阅读" en="Scan to read online" />
            </span>
          </div>
        ) : null}
        <div className="print-backcover__bio">
          <p className="print-backcover__author">
            <T zh="作者" en="By" />
            <span className="print-backcover__author-sep"> · </span>
            <span className="print-backcover__author-name">{book.author}</span>
          </p>
          <p className="print-backcover__biotext">
            <T
              zh="Zhapar —— 写给已经付费 Kimi、却只用到一小部分的人：这套 agent 栈里该用哪一面、买哪档够用、什么时候回 frontier。写代码，也写字。"
              en="Zhapar — for people already paying for Kimi but using only a fraction of it: which surface of the agent stack to use, which tier is enough, and when to go back to the frontier. A writer and engineer."
            />
          </p>
        </div>
      </div>

      <div className="print-backcover__notice">
        <span className="print-backcover__notice-ico">{BACK_ICON_INFO}</span>
        <p className="print-backcover__notice-text">
          <T
            zh="这是静态 PDF 快照；网页版阅读体验更佳，内容持续更新、数据更及时准确。"
            en="This is a static PDF snapshot — the web edition reads better and stays current, with the latest, most accurate data."
          />
        </p>
      </div>

      <div className="print-backcover__links">
        {links.map((l, i) => (
          <span className="print-backcover__link-item" key={l.key}>
            {i > 0 ? (
              <span className="print-backcover__link-sep" aria-hidden="true">
                ·
              </span>
            ) : null}
            <a className="print-backcover__link" href={l.href}>
              <span className="print-backcover__link-ico">{l.icon}</span>
              {l.label}
            </a>
          </span>
        ))}
      </div>

      <dl className="print-backcover__stats">
        {stats.map((s) => (
          <div className="print-backcover__stat" key={s.key}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      <span className="print-backcover__rule" />

      <div className="print-backcover__legal">
        <p className="print-backcover__copy">© {year} · Zhapar</p>
        <p className="print-backcover__disclaimer">
          <T
            zh="本书仅供学习交流，内容基于公开资料整理，不构成商业建议。"
            en="For study and discussion only — compiled from public sources, not commercial advice."
          />
        </p>
      </div>
    </section>
  );
}
