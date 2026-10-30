import assert from "node:assert/strict";
import test from "node:test";
import { markdownResponse } from "../lib/markdown-response";

test("markdown responses revalidate with an ETag", async () => {
  const initial = markdownResponse(
    new Request("https://kimi.read.wiki/books/kimi/llms.md"),
    "# Kimi\n",
    "/books/kimi/llms.md",
  );
  assert.equal(initial.status, 200);
  assert.equal(await initial.text(), "# Kimi\n");
  assert.equal(initial.headers.get("cache-control"), "public, no-cache");

  const etag = initial.headers.get("etag");
  assert.ok(etag);
  const revalidated = markdownResponse(
    new Request("https://kimi.read.wiki/books/kimi/llms.md", {
      headers: { "if-none-match": etag },
    }),
    "# Kimi\n",
    "/books/kimi/llms.md",
  );
  assert.equal(revalidated.status, 304);
  assert.equal(await revalidated.text(), "");
});
