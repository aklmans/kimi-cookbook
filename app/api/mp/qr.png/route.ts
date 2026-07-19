import QRCode from "qrcode";

/* QR PNG for the Mini Program's share poster. The MP's canvas can't
   fetch images with headers, so this is a public, read-only, cached
   endpoint. The url param is pinned to this site's own origin — an
   open QR-anything proxy is not a thing we ship. */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOST = "kimi.read.wiki";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  if (target.protocol !== "https:" || target.host !== ALLOWED_HOST) {
    return new Response("url must be on this site", { status: 400 });
  }

  const png = await QRCode.toBuffer(target.toString(), {
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
