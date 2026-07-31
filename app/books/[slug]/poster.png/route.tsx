import { getAllBooks, getBook } from "@/lib/books";
import { renderBookPoster } from "@/lib/book-poster";

/* Book-level share poster — LIGHT variant. The renderer (Zhaphar/MP
   grammar, fonts, QR, moon card) lives in lib/book-poster.tsx, shared
   with the dark variant at poster.dark.png; the hero link picks per the
   reader's theme. Prerendered at build, served immutable; the link
   carries ?v=<bookModifiedAt> so content updates still bust caches. */

export const dynamic = "force-static";
export const dynamicParams = false;

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  void req;
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) return new Response("not found", { status: 404 });
  return renderBookPoster(book, "light");
}
