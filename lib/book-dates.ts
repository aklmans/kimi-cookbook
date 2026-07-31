import type { BookMeta, Chapter } from "./types";

/** Resolve a chapter's publish date for RSS / og:article:published_time.
    Order: explicit `publishedAt` -> first revision month + chapter day -> book date. */
export function chapterPublishedAt(
  book: BookMeta,
  chapter: Chapter,
  chapterIndex = 0,
): string {
  if (chapter.publishedAt) {
    return chapter.publishedAt.length === 7
      ? `${chapter.publishedAt}-01`
      : chapter.publishedAt;
  }
  const first = chapter.revisions[0]?.date;
  if (first) {
    if (first.length === 7) {
      const day = String(Math.min(chapterIndex + 1, 28)).padStart(2, "0");
      return `${first}-${day}`;
    }
    return first;
  }
  return book.date;
}

/** Normalize a revision date to a full "YYYY-MM-DD" string.
    Revision dates may be "YYYY-MM" (month) or "YYYY-MM-DD" (full date);
    older code appended "-01" unconditionally, which turned a full date
    into an invalid "YYYY-MM-DD-01". */
function normalizeDate(date: string): string {
  return date.length === 7 ? `${date}-01` : date;
}

/** Resolve a chapter's last-modified date for og:article:modified_time. */
export function chapterModifiedAt(book: BookMeta, chapter: Chapter): string {
  const last = chapter.revisions[chapter.revisions.length - 1]?.date;
  if (last) return normalizeDate(last);
  return chapterPublishedAt(book, chapter);
}

/** The book's last-modified date — the newest chapter modified date,
    falling back to the book's own date. Drives the ?v= cache-buster on
    the book-level share poster (a chapter edit must bust it too). */
export function bookModifiedAt(book: BookMeta): string {
  let latest = book.date;
  for (const chapter of book.chapters) {
    const modified = chapterModifiedAt(book, chapter);
    if (modified > latest) latest = modified;
  }
  return latest;
}
