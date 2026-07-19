import { getAllBooks, chapterModifiedAt } from "@/lib/books";
import { ABOUT_UPDATED } from "@/content/books/kimi/about";

/* Mini Program cache-invalidation beacon. The MP stores book + chapter
   payloads locally; it compares this version string to decide whether
   its cache is stale. Bumped by any book-level or chapter-level date
   change, i.e. by every deploy that touches content — and by edits to
   the about-page module (ABOUT_UPDATED). */

export const dynamic = "force-static";

export function GET() {
  const book = getAllBooks()[0];
  if (!book) {
    return Response.json({ error: "no book" }, { status: 404 });
  }

  const chapters = Object.fromEntries(
    book.chapters.map((c) => [c.slug, chapterModifiedAt(book, c)]),
  );
  const latest = [book.date, ABOUT_UPDATED, ...Object.values(chapters)]
    .sort()
    .pop()!;

  return Response.json(
    {
      version: `${book.date}#${latest}`,
      updated: latest,
      chapters,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
