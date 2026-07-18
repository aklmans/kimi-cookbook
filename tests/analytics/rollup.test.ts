import { test, before } from "node:test";
import assert from "node:assert/strict";
import { tempDbPath, openDb, seedEvents } from "./helpers";
import {
  queryAnalytics,
  rollupDailyStats,
  pruneOldEvents,
  retentionDays,
  DEFAULT_RETENTION_DAYS,
} from "@/lib/db";
import { isCronRequest } from "@/lib/analytics-auth";

process.env.DATABASE_URL = tempDbPath();
delete process.env.ANALYTICS_RETENTION_DAYS;

const countEvents = () => {
  const db = openDb(process.env.DATABASE_URL!);
  try {
    return (db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number }).c;
  } finally {
    db.close();
  }
};
const countDailyStats = () => {
  const db = openDb(process.env.DATABASE_URL!);
  try {
    return (db.prepare("SELECT COUNT(*) c FROM daily_stats").get() as { c: number }).c;
  } finally {
    db.close();
  }
};

before(async () => {
  await queryAnalytics("overview", { range: 1 }); // create schema
  const db = openDb(process.env.DATABASE_URL!);
  seedEvents(db, [
    { type: "book_view", book_slug: "kimi", daysAgo: 100 }, // beyond retention
    { type: "chapter_view", book_slug: "kimi", daysAgo: 100 },
    { type: "book_view", book_slug: "kimi", daysAgo: 1 }, // recent
  ]);
  db.close();
});

test("retentionDays defaults to DEFAULT_RETENTION_DAYS, honors the env override", () => {
  assert.equal(retentionDays(), DEFAULT_RETENTION_DAYS);
  process.env.ANALYTICS_RETENTION_DAYS = "30";
  assert.equal(retentionDays(), 30);
  delete process.env.ANALYTICS_RETENTION_DAYS;
});

test("rollup writes daily_stats; prune removes old raw events but keeps the rollup", async () => {
  const rolled = await rollupDailyStats();
  assert.ok(rolled >= 0);
  assert.ok(countDailyStats() > 0, "daily_stats populated");

  const before = countEvents();
  const pruned = await pruneOldEvents(90);
  assert.equal(pruned, 2, "the two 100-day-old rows are pruned");
  assert.equal(countEvents(), before - 2);
  assert.ok(countDailyStats() > 0, "aggregate counts survive the prune");
});

test("isCronRequest is timing-safe and gated on CRON_SECRET", () => {
  delete process.env.CRON_SECRET;
  assert.equal(
    isCronRequest(new Request("http://x/", { headers: { authorization: "Bearer anything" } })),
    false,
    "no secret configured → reject",
  );

  process.env.CRON_SECRET = "cron-secret-value";
  assert.equal(
    isCronRequest(new Request("http://x/", { headers: { authorization: "Bearer cron-secret-value" } })),
    true,
  );
  assert.equal(
    isCronRequest(new Request("http://x/", { headers: { authorization: "Bearer wrong" } })),
    false,
  );
  assert.equal(isCronRequest(new Request("http://x/")), false, "no header → reject");
  delete process.env.CRON_SECRET;
});
