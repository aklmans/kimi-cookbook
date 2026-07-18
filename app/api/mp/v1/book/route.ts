import { getAllBooks, bookDateShort, chapterNumber } from "@/lib/books";
import { absoluteUrl } from "@/lib/site";

/* Mini Program content API — the single book's meta + chapter list.
   Read-only, cached for an hour; the MP caches it locally and only
   re-fetches on expiry (or when /api/mp/v1/version moves). */

export const dynamic = "force-static";

export function GET() {
  const book = getAllBooks()[0];
  if (!book) {
    return Response.json({ error: "no book" }, { status: 404 });
  }

  return Response.json(
    {
      slug: book.slug,
      title: book.title,
      coverTitle: book.coverTitle || book.title,
      lede: book.lede || book.description,
      author: book.author,
      updated: bookDateShort(book.date),
      readMinutes: book.readMinutes,
      site: absoluteUrl("/"),
      chapters: book.chapters.map((c, i) => ({
        slug: c.slug,
        number: chapterNumber(i),
        title: c.title,
        titleShort: c.titleShort ?? c.title,
        readTime: c.readTime,
        lede: c.lede ?? "",
        draft: Boolean(c.draft),
      })),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
