import { test, before } from "node:test";
import assert from "node:assert/strict";
import { tempDbPath, openDb, seedEvents, type OverviewResult } from "./helpers";
// Static import is fine: db.ts reads DATABASE_URL lazily (first getDriver call),
// so setting the env below — before any query runs — still targets the temp DB.
import { queryAnalytics } from "@/lib/db";

process.env.DATABASE_URL = tempDbPath();

before(async () => {
  await queryAnalytics("overview", { range: 1 }); // create schema
  const db = openDb(process.env.DATABASE_URL!);
  seedEvents(db, [
    // v1: other on days 1 & 2 (returning) + kimi on day 2 (same person, cross-book)
    { type: "chapter_view", book_slug: "other", visitor_id: "v1", daysAgo: 1 },
    { type: "chapter_view", book_slug: "other", visitor_id: "v1", daysAgo: 2 },
    { type: "chapter_view", book_slug: "kimi", visitor_id: "v1", daysAgo: 2 },
    // v2: other on day 1 only (new)
    { type: "chapter_view", book_slug: "other", visitor_id: "v2", daysAgo: 1 },
    // v3: kimi on days 3,4,5 (returning)
    { type: "chapter_view", book_slug: "kimi", visitor_id: "v3", daysAgo: 3 },
    { type: "chapter_view", book_slug: "kimi", visitor_id: "v3", daysAgo: 4 },
    { type: "chapter_view", book_slug: "kimi", visitor_id: "v3", daysAgo: 5 },
    // a search bot with an id across 2 days — must NOT count as a visitor
    { type: "chapter_view", book_slug: "kimi", visitor_id: "bot1", visitor_kind: "search_bot", daysAgo: 1 },
    { type: "chapter_view", book_slug: "kimi", visitor_id: "bot1", visitor_kind: "search_bot", daysAgo: 2 },
    // a human with no durable id — not a unique visitor
    { type: "chapter_view", book_slug: "kimi", visitor_id: null, daysAgo: 1 },
  ]);
  db.close();
});

test("site-wide unique/returning/new exclude bots and null ids", async () => {
  const ov = (await queryAnalytics("overview", { range: 30 })) as unknown as OverviewResult;
  assert.equal(ov.visitors.unique_visitors, 3, "v1, v2, v3");
  assert.equal(ov.visitors.returning_visitors, 2, "v1, v3 (>=2 distinct days)");
  assert.equal(ov.visitors.new_visitors, 1, "v2");
});

test("book-scoped visitors reflect only that book's activity", async () => {
  const other = (await queryAnalytics("overview", { range: 30, bookSlug: "other" })) as unknown as OverviewResult;
  assert.equal(other.visitors.unique_visitors, 2, "v1, v2 on other");
  assert.equal(other.visitors.returning_visitors, 1, "v1 (other days 1 & 2)");
  assert.equal(other.visitors.new_visitors, 1, "v2");
});

test("range window drops visitors outside it", async () => {
  const narrow = (await queryAnalytics("overview", { range: 2 })) as unknown as OverviewResult;
  assert.equal(narrow.visitors.unique_visitors, 2, "v1, v2; v3 (days 3-5) excluded");
});
