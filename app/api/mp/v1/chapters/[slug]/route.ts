import { getAllBooks, getChapter } from "@/lib/books";
import { renderChapterToMpHtml } from "@/lib/mp-render";

/* Mini Program content API — one chapter as restricted HTML (see
   lib/mp-render.tsx for the MDX → HTML degradation contract). Same
   routing model as the rest of the site: dynamicParams=false +
   generateStaticParams over the single book's chapters. */

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().flatMap((b) =>
    b.chapters.map((c) => ({ slug: c.slug })),
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const book = getAllBooks()[0];
  const found = book && getChapter(book, slug);
  if (!book || !found) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const { chapter, index } = found;
  const payload = await renderChapterToMpHtml(book, chapter, index);
  const prev = index > 0 ? book.chapters[index - 1] : null;
  const next =
    index < book.chapters.length - 1 ? book.chapters[index + 1] : null;

  return Response.json(
    {
      ...payload,
      bookTitle: book.title,
      prev: prev
        ? { slug: prev.slug, title: prev.titleShort ?? prev.title }
        : null,
      next: next
        ? { slug: next.slug, title: next.titleShort ?? next.title }
        : null,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
