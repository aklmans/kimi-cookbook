import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/mp/qr.png/route";

/* Contract tests for /api/mp/qr.png — the QR encoder behind the chapter
   bar's popover and the Mini Program poster. The url param must be a
   canonical book or chapter page on this site's own origin; anything
   else (foreign hosts, off-manifest paths, query/hash riders) is a 400,
   because each unique ?url= would otherwise miss the day-long cache and
   burn a fresh PNG render. */

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function requestFor(url: string): Request {
  return new Request(
    `http://localhost/api/mp/qr.png?url=${encodeURIComponent(url)}`,
  );
}

test("a canonical chapter page encodes to a PNG", async () => {
  const res = await GET(
    requestFor("https://kimi.read.wiki/books/kimi/01-intro"),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/png");
  const body = Buffer.from(await res.arrayBuffer());
  assert.deepEqual(body.subarray(0, 4), PNG_MAGIC);
});

test("the book intro page is allowed, with or without a trailing slash", async () => {
  const plain = await GET(requestFor("https://kimi.read.wiki/books/kimi"));
  assert.equal(plain.status, 200);
  const slashed = await GET(requestFor("https://kimi.read.wiki/books/kimi/"));
  assert.equal(slashed.status, 200);
});

test("a url carrying a query is rejected (cache-busting vector)", async () => {
  const res = await GET(
    requestFor("https://kimi.read.wiki/books/kimi/01-intro?r=1"),
  );
  assert.equal(res.status, 400);
});

test("a url carrying a hash is rejected", async () => {
  const res = await GET(
    requestFor("https://kimi.read.wiki/books/kimi/01-intro#toc"),
  );
  assert.equal(res.status, 400);
});

test("a chapter slug outside the manifest is rejected", async () => {
  const res = await GET(
    requestFor("https://kimi.read.wiki/books/kimi/99-nope"),
  );
  assert.equal(res.status, 400);
});

test("a same-site page outside the book is rejected", async () => {
  const res = await GET(requestFor("https://kimi.read.wiki/about"));
  assert.equal(res.status, 400);
});

test("a foreign host is rejected", async () => {
  const res = await GET(requestFor("https://example.com/books/kimi"));
  assert.equal(res.status, 400);
});

test("an http downgrade of the site origin is rejected", async () => {
  const res = await GET(requestFor("http://kimi.read.wiki/books/kimi"));
  assert.equal(res.status, 400);
});

test("a non-url value is rejected", async () => {
  const res = await GET(requestFor("not a url"));
  assert.equal(res.status, 400);
});
