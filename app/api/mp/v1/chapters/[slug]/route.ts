import { getAllBooks, getChapter } from "@/lib/books";
import { renderChapterToMpHtml } from "@/lib/mp-render";
import { trackMpRead } from "@/lib/analytics-server";

/* Mini Program content API — one chapter as restricted HTML (see
   lib/mp-render.tsx for the MDX → HTML degradation contract). Dynamic
   so every fetch can be tracked (mp_chapter_read); the compiled
   payload is cached per process, so the MDX compile cost is paid once
   per chapter per release, not per request. */

export const dynamic = "force-dynamic";
export const dynamicParams = false;

/* Per-process compiled-payload cache (see header comment). */
const payloadCache = new Map<string, Awaited<ReturnType<typeof renderChapterToMpHtml>>>();

export function generateStaticParams() {
  return getAllBooks().flatMap((b) =>
    b.chapters.map((c) => ({ slug: c.slug })),
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const book = getAllBooks()[0];
  const found = book && getChapter(book, slug);
  if (!book || !found) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  trackMpRead("mp_chapter_read", book.slug, slug, req.headers.get("user-agent"));

  const { chapter, index } = found;
  // Payload only changes at deploy time, and a process serves one release —
  // compile each chapter once per process instead of per request.
  let payload = payloadCache.get(slug);
  if (!payload) {
    payload = await renderChapterToMpHtml(book, chapter, index);
    payloadCache.set(slug, payload);
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
