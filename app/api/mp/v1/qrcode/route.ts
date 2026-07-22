import { getAllBooks, getChapter } from "@/lib/books";
import { getMpQrcode, MpQrcodeError } from "@/lib/mp-qrcode";

/* Mini Program code (wxacode.getUnlimited) for the MP's share posters:
   no slug → home-page code (pages/book/book); a chapter slug from the
   book manifest → chapter direct code (pages/read/read?scene=<slug>),
   anything else → 400. Codes are immutable, so the binary is cached
   forever (lib/mp-qrcode.ts caches per process + on disk) and the
   response carries an immutable year-long Cache-Control. Public and
   read-only, same posture as /api/mp/qr.png. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOME_PAGE = "pages/book/book";
const CHAPTER_PAGE = "pages/read/read";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  let page = HOME_PAGE;
  let scene: string | undefined;
  if (slug) {
    const book = getAllBooks()[0];
    if (!book || !getChapter(book, slug)) {
      return Response.json({ error: "unknown chapter slug" }, { status: 400 });
    }
    page = CHAPTER_PAGE;
    scene = slug;
  }

  try {
    const image = await getMpQrcode(page, scene);
    const isJpeg = image.length > 3 && image[0] === 0xff && image[1] === 0xd8;
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": isJpeg ? "image/jpeg" : "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    if (err instanceof MpQrcodeError) {
      console.error(`[mp-qrcode] ${err.message}`);
      return new Response(err.message, { status: err.status });
    }
    console.error("[mp-qrcode] unexpected error", err);
    return new Response("qrcode upstream error", { status: 502 });
  }
}
