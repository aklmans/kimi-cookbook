import { test, before } from "node:test";
import assert from "node:assert/strict";
import { tempDbPath, openDb, seedEvents, type OverviewResult } from "./helpers";
import { queryAnalytics } from "@/lib/db";

process.env.DATABASE_URL = tempDbPath();

before(async () => {
  await queryAnalytics("overview", { range: 1 });
  const db = openDb(process.env.DATABASE_URL!);
  seedEvents(db, [
    { type: "outbound_click", book_slug: "_outbound", extra: "github.com", daysAgo: 1 },
    { type: "outbound_click", book_slug: "_outbound", extra: "github.com", daysAgo: 1 },
    { type: "outbound_click", book_slug: "_outbound", extra: "x.com", daysAgo: 1 },
    { type: "search_query", book_slug: "_search", extra: "warp terminal", daysAgo: 1 },
    { type: "search_query", book_slug: "_search", extra: "warp terminal", daysAgo: 1 },
    { type: "search_query", book_slug: "_search", extra: "kimi long context", daysAgo: 1 },
    { type: "not_found", book_slug: "_404", extra: "/broken/link", daysAgo: 1 },
    // a bot search must be excluded from human signal counts
    { type: "search_query", book_slug: "_search", extra: "spammy", visitor_kind: "bot", daysAgo: 1 },
  ]);
  db.close();
});

test("signals are surfaced, aggregated, and sorted desc", async () => {
  const ov = (await queryAnalytics("overview", { range: 5 })) as unknown as OverviewResult;
  assert.ok(ov.signals, "signals block present");

  const gh = ov.signals.outbound.find((r) => r.value === "github.com");
  assert.equal(gh?.count, 2, "github.com aggregated");
  assert.equal(ov.signals.outbound[0].value, "github.com", "sorted by count desc");

  const topSearch = ov.signals.searches[0];
  assert.equal(topSearch.value, "warp terminal");
  assert.equal(topSearch.count, 2);
  assert.ok(
    !ov.signals.searches.some((r) => r.value === "spammy"),
    "bot search excluded",
  );

  assert.ok(ov.signals.notFound.some((r) => r.value === "/broken/link"));
});

test("signal sentinels do not pollute book / page metrics", async () => {
  const ov = (await queryAnalytics("overview", { range: 5 })) as unknown as OverviewResult;
  assert.equal(ov.bookTotals.count, 0, "no real book events");
  assert.equal(ov.pageTotals.count, 0, "no page_view/feed_read");
  assert.equal(ov.topPages.length, 0, "sentinels excluded from pages");
});
