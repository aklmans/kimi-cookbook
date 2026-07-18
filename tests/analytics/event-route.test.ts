import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { tempDbPath, openDb, eventRequest } from "./helpers";
import { queryAnalytics } from "@/lib/db";
import { POST } from "@/app/api/analytics/event/route";
import { __resetIngestRateLimit } from "@/lib/analytics-rate-limit";

process.env.DATABASE_URL = tempDbPath();

function lastRow() {
  const db = openDb(process.env.DATABASE_URL!);
  try {
    return db
      .prepare("SELECT type, session_id, visitor_id, book_slug, extra FROM events ORDER BY id DESC LIMIT 1")
      .get() as Record<string, string | null>;
  } finally {
    db.close();
  }
}

before(async () => {
  await queryAnalytics("overview", { range: 1 }); // create schema
});
beforeEach(() => __resetIngestRateLimit());

test("stores the durable visitor id distinctly from the session id", async () => {
  const res = await POST(
    eventRequest({ type: "page_view", pageSlug: "home", sessionId: "sess-A", visitorId: "vid-B" }),
  );
  assert.equal(res.status, 204);
  const row = lastRow();
  assert.equal(row.session_id, "sess-A");
  assert.equal(row.visitor_id, "vid-B");
  assert.notEqual(row.session_id, row.visitor_id);
});

test("legacy client without visitorId falls back to the session id", async () => {
  const res = await POST(
    eventRequest({ type: "page_view", pageSlug: "home", sessionId: "sess-legacy" }),
  );
  assert.equal(res.status, 204);
  const row = lastRow();
  assert.equal(row.visitor_id, "sess-legacy");
});

test("rejects oversized bodies (413) — declared and actual", async () => {
  const big = "x".repeat(5000);
  assert.equal(
    (await POST(eventRequest({ type: "page_view", pageSlug: "home", filler: big }))).status,
    413,
  );
  assert.equal(
    (
      await POST(
        eventRequest({ type: "page_view", pageSlug: "home" }, { "content-length": "999999" }),
      )
    ).status,
    413,
  );
});

test("rate-limits a single id (429 + Retry-After)", async () => {
  const { INGEST_RATE_LIMIT, checkIngestRateLimit } = await import("@/lib/analytics-rate-limit");
  __resetIngestRateLimit();
  for (let i = 0; i < INGEST_RATE_LIMIT.maxPerWindow; i++) checkIngestRateLimit("flood");
  const res = await POST(
    eventRequest({ type: "page_view", pageSlug: "home", visitorId: "flood", sessionId: "flood" }),
  );
  assert.equal(res.status, 429);
  assert.ok(res.headers.get("retry-after"));
});

test("outbound_click stores the external host only, under the _outbound sentinel", async () => {
  const res = await POST(eventRequest({ type: "outbound_click", detail: "https://www.github.com/a/b" }));
  assert.equal(res.status, 204);
  const row = lastRow();
  assert.equal(row.extra, "github.com");
  assert.equal(row.book_slug, "_outbound");
});

test("search_query is normalized; 404 keeps path only; junk is rejected", async () => {
  assert.equal((await POST(eventRequest({ type: "search_query", detail: "  Warp Terminal " }))).status, 204);
  assert.equal(lastRow().extra, "warp terminal");

  assert.equal((await POST(eventRequest({ type: "not_found", detail: "/x/y?q=secret#h" }))).status, 204);
  assert.equal(lastRow().extra, "/x/y");

  assert.equal((await POST(eventRequest({ type: "outbound_click", detail: "mailto:a@b.com" }))).status, 400);
  assert.equal((await POST(eventRequest({ type: "search_query", detail: "   " }))).status, 400);
});
