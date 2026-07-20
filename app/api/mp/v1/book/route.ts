import { getAllBooks, bookDateShort, chapterNumber } from "@/lib/books";
import { absoluteUrl } from "@/lib/site";
import { about } from "@/content/books/kimi/about";
import { trackMpRead } from "@/lib/analytics-server";

/* Mini Program content API — the single book's meta + chapter list,
   plus the「关于本书」page payload (about). Read-only, cached for an
   hour; the MP caches it locally and only re-fetches on expiry (or
   when /api/mp/v1/version moves). */

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const book = getAllBooks()[0];
  if (!book) {
    return Response.json({ error: "no book" }, { status: 404 });
  }

  trackMpRead("mp_book_open", book.slug, null, req.headers.get("user-agent"));

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
      about,
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
