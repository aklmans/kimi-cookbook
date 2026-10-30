import { getBook, getChapter } from "@/lib/books";
import { renderChapterToMpHtml } from "@/lib/mp-render";
import { trackMpRead } from "@/lib/analytics-server";

/* Mini Program content API — the current single-book Kimi reader as
   restricted HTML (see lib/mp-render.tsx for the degradation contract).
   Dynamic so every fetch can be tracked; compiled payloads are cached per
   process, keyed by both book and chapter to avoid cross-book collisions. */

export const dynamic = "force-dynamic";
export const dynamicParams = false;

const payloadCache = new Map<string, Awaited<ReturnType<typeof renderChapterToMpHtml>>>();

export function generateStaticParams() {
  return getBook("kimi")?.chapters.map((chapter) => ({ slug: chapter.slug })) ?? [];
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const book = getBook("kimi");
  const found = book && getChapter(book, slug);
  if (!book || !found) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  trackMpRead("mp_chapter_read", book.slug, slug, req.headers.get("user-agent"));

  const { chapter, index } = found;
  // Payload only changes at deploy time, and a process serves one release.
  const cacheKey = `${book.slug}/${slug}`;
  let payload = payloadCache.get(cacheKey);
  if (!payload) {
    payload = await renderChapterToMpHtml(book, chapter, index);
    payloadCache.set(cacheKey, payload);
  }
  const prev = index > 0 ? book.chapters[index - 1] : null;
  const next =
    index < book.chapters.length - 1 ? book.chapters[index + 1] : null;

  return Response.json(
    {
      ...payload,
      bookTitle: book.title,
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    },
  );
}
