import { getAllBooks, getBook } from "@/lib/books";
import { renderBookPoster } from "@/lib/book-poster";

/* Book-level share poster — DARK variant, same grammar as the light
   one at poster.png (see lib/book-poster.tsx); the hero link picks this
   file for dark-theme readers, like the MP follows its reader's theme. */

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
  return renderBookPoster(book, "dark");
}
