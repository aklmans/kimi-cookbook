import QRCode from "qrcode";
import { getAllBooks } from "@/lib/books";
import { SITE_URL } from "@/lib/site";

/* QR PNG encoder. Born for the Mini Program's share poster (the MP's
   canvas can't fetch images with headers, so this is a public, read-only,
   cached endpoint); the WEB chapter bar's QR popover
   (components/mdx/ChapterActions) reuses it too — the /api/mp namespace
   is historical, and renaming the route would force a WeChat
   download-domain re-whitelist, so the cross-namespace dependency stays
   documented here instead of moved.

   The url param is pinned to this site's own origin AND to canonical
   book / chapter pages with no query or hash. An open QR-anything proxy
   is not a thing we ship — and since Cache-Control keys on the full
   request URL, every unique ?url= (…?r=<random>) would otherwise miss
   the day-long cache and burn a fresh PNG render each time, a free CPU
   loop on the 1-core ECS. No Access-Control-Allow-Origin header: the
   web renders the PNG via <img> and the MP via wx.downloadFile's domain
   whitelist — neither is a CORS consumer. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_ORIGIN = new URL(SITE_URL).origin;

/* Canonical book intro + published chapter pages — the only targets the
   QR popover (and the MP poster) ever encode. Draft chapters are
   excluded: their routes render DraftNotice, never the reading-aids
   bar, so a QR for one should never be minted. */
const ALLOWED_PATHS = new Set(
  getAllBooks().flatMap((book) => [
    `/books/${book.slug}`,
    ...book.chapters
      .filter((chapter) => !chapter.draft)
      .map((chapter) => `/books/${book.slug}/${chapter.slug}`),
  ]),
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (target.origin !== SITE_ORIGIN) {
    return new Response("url must be on this site", { status: 400 });
  }
  if (target.search || target.hash) {
    return new Response("canonical page urls only", { status: 400 });
  }
  const pathname = target.pathname.replace(/\/+$/, "");
  if (!ALLOWED_PATHS.has(pathname)) {
    return new Response("not a book or chapter page", { status: 400 });
  }

  const png = await QRCode.toBuffer(`${SITE_ORIGIN}${pathname}`, {
    type: "png",
    margin: 1,
    width: 264,
    errorCorrectionLevel: "M",
    color: { dark: "#1A1A1A", light: "#FAFAFA" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
