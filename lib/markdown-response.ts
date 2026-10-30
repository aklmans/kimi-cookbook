import { createHash } from "node:crypto";

export function markdownResponse(
  req: Request,
  body: string,
  contentLocation: string,
): Response {
  const etag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Location": contentLocation,
    "Cache-Control": "public, no-cache",
    ETag: etag,
  });
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { headers });
}
