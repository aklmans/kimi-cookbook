import type { BookMeta, Chapter, CommentsMode } from "./types";
export { chapterModifiedAt, chapterPublishedAt } from "./book-dates";
import { meta as kimi } from "@/content/books/kimi/meta";

/* README.md §数据层 — every reading surface (routes, home, RSS, sitemap,
   search, OG, llms.txt) aggregates the per-book meta.ts files through this
   static manifest. kimi-cookbook is a single-book site: the manifest holds
   exactly one book, so every surface converges on it automatically. */
const BOOKS: BookMeta[] = [kimi];

/** All published books, newest first. Books with `draft: true` are
    filtered out — they don't appear in the library, on the home page,
    in RSS, in search, or as generated static routes. */
export function getAllBooks(): BookMeta[] {
  return [...BOOKS]
    .filter((b) => !b.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getBook(slug: string): BookMeta | undefined {
  // Drafts excluded — the corresponding route was never generated
  // (generateStaticParams uses getAllBooks), so this just keeps the
  // lookup consistent with what the routing layer sees.
  return BOOKS.find((b) => b.slug === slug && !b.draft);
}

export function getPreviousBook(slug: string): BookMeta | undefined {
  return BOOKS.find((b) => b.nextBook === slug && !b.draft);
}

export function getChapter(
  book: BookMeta,
  chapterSlug: string,
): { chapter: Chapter; index: number } | undefined {
  const index = book.chapters.findIndex((c) => c.slug === chapterSlug);
  if (index < 0) return undefined;
  return { chapter: book.chapters[index], index };
}

/** Resolve comment-area visibility for a chapter. Explicit, TESTED default of
    "enabled": comments show unless a chapter or book opts out (chapter wins). A
    silent "hidden"/"disabled" default once hid a whole comment section unnoticed
    in the sister project, so quality-check.mjs asserts this default stays
    "enabled". */
export function commentsMode(book: BookMeta, chapter: Chapter): CommentsMode {
  return chapter.comments ?? book.comments ?? "enabled";
}

/** Chapter number, 1-based, at least 2 digits — e.g. index 1 -> "02". */
export function chapterNumber(index: number): string {
  const n = index + 1;
  return String(n).padStart(Math.max(2, String(n).length), "0");
}

/** "2026-05-18" -> "2026.05" */
export function bookDateShort(date: string): string {
  const [y, m] = date.split("-");
  return `${y}.${m}`;
}
