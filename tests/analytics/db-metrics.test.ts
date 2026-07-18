import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  tempDbPath,
  openDb,
  seedEvents,
  type OverviewResult,
  type BookViewResult,
} from "./helpers";
import { queryAnalytics } from "@/lib/db";

process.env.DATABASE_URL = tempDbPath();

before(async () => {
  await queryAnalytics("overview", { range: 1 });
  const db = openDb(process.env.DATABASE_URL!);
  seedEvents(db, [
    // warp: 2 views but 3 completes on the same chapter → 150% raw
    { type: "chapter_view", book_slug: "kimi", chapter_slug: "c1", daysAgo: 1 },
    { type: "chapter_view", book_slug: "kimi", chapter_slug: "c1", daysAgo: 1 },
    { type: "chapter_complete", book_slug: "kimi", chapter_slug: "c1", daysAgo: 1 },
    { type: "chapter_complete", book_slug: "kimi", chapter_slug: "c1", daysAgo: 1 },
    { type: "chapter_complete", book_slug: "kimi", chapter_slug: "c1", daysAgo: 1 },
    // warp landing with an external referrer (book-scoped referrer source)
    { type: "book_view", book_slug: "kimi", referrer: "https://www.google.com/search?q=warp", daysAgo: 1 },
    // a bot view that must be excluded from human metrics
    { type: "chapter_view", book_slug: "kimi", chapter_slug: "c1", visitor_kind: "bot", daysAgo: 1 },
    // a static-page view with a different external referrer (site-wide source)
    { type: "page_view", book_slug: "home", referrer: "https://t.co/abc123", daysAgo: 1 },
  ]);
  db.close();
});

const overview = async (opts: { range: number; bookSlug?: string }) =>
  (await queryAnalytics("overview", opts)) as unknown as OverviewResult;

test("completion_rate is clamped at 100% (150% raw)", async () => {
  const ov = await overview({ range: 5 });
  assert.equal(ov.bookTotals.completion_rate, 100);
  const warp = ov.topBooks.find((b) => b.book_slug === "kimi");
  assert.ok(warp && warp.completion_rate <= 100);
});

test("a bot view is excluded from human book totals", async () => {
  const ov = await overview({ range: 5 });
  // 2 human chapter_views seeded (the bot's third is filtered out).
  assert.equal(ov.bookTotals.chapter_views, 2);
});

test("daily trends are zero-filled to a dense series", async () => {
  const ov = await overview({ range: 5 });
  assert.equal(ov.bookDailyTrend.length, 6, "since..today inclusive");
  assert.equal(ov.pageDailyTrend.length, 6);
  const zeroDays = ov.bookDailyTrend.filter((r) => r.count === 0);
  assert.equal(zeroDays.length, 5, "only day-1 has events");
  const days = ov.bookDailyTrend.map((r) => r.day);
  assert.deepEqual(days, [...days].sort(), "days are sorted");
});

test("referrers are site-wide (page_view) by default", async () => {
  const ov = await overview({ range: 5 });
  const hosts = ov.topReferrers.map((r) => r.referrer).join(" ");
  assert.ok(hosts.includes("t.co"), "page_view referrer present");
  assert.ok(!hosts.includes("google"), "book_view referrer excluded site-wide");
});

test("referrers scope to the selected book when filtering", async () => {
  const warp = await overview({ range: 5, bookSlug: "kimi" });
  const hosts = warp.topReferrers.map((r) => r.referrer).join(" ");
  assert.ok(hosts.includes("google"), "warp book_view referrer present");
  assert.ok(!hosts.includes("t.co"), "home page_view referrer excluded");
  assert.ok(
    warp.topReferrerCategories.some((c) => c.category === "Search"),
    "google categorized as Search",
  );
});

test("view=book returns a zero-filled trend and clamped chapter stats", async () => {
  const book = (await queryAnalytics("book", { range: 5, bookSlug: "kimi" })) as unknown as BookViewResult;
  assert.equal(book.dailyTrend.length, 6);
  assert.ok(book.chapterStats.every((c) => c.completion_rate <= 100));
});
