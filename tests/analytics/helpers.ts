/**
 * Shared helpers for the analytics test suite (run via `tsx --test`).
 *
 * Integration tests exercise the real db.ts / route handlers against a throwaway
 * SQLite file. db.ts picks its driver from DATABASE_URL at first query and caches
 * a singleton, so every test FILE sets its own DATABASE_URL *before* importing
 * db.ts — node:test runs each file in its own process, so the singletons never
 * collide. Seeding backdated rows goes through a direct better-sqlite3 handle on
 * the same file (insertEvent has no `ts` param).
 */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

/** A fresh temp DB path. Assign to process.env.DATABASE_URL before importing db. */
export function tempDbPath(): string {
  return join(mkdtempSync(join(tmpdir(), "aklman-test-")), "test.db");
}

/** Open a direct handle on the same file db.ts uses (for seeding / inspection). */
export function openDb(path: string): Database.Database {
  return new Database(path);
}

/** A UTC ISO timestamp `n` days before now (seconds precision, trailing Z). */
export function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 19) + "Z";
}

export interface SeedEvent {
  type: string;
  book_slug: string;
  chapter_slug?: string | null;
  session_id?: string | null;
  visitor_id?: string | null;
  visitor_kind?: string | null;
  referrer?: string | null;
  extra?: string | null;
  daysAgo?: number;
}

/** Bulk-insert events with explicit ts (defaults to 1 day ago) via a raw handle. */
export function seedEvents(db: Database.Database, events: SeedEvent[]): void {
  const stmt = db.prepare(
    `INSERT INTO events (type, book_slug, chapter_slug, session_id, visitor_id, visitor_kind, referrer, extra, ts)
     VALUES (@type, @book_slug, @chapter_slug, @session_id, @visitor_id, @visitor_kind, @referrer, @extra, @ts)`,
  );
  const insertMany = db.transaction((rows: SeedEvent[]) => {
    for (const e of rows) {
      stmt.run({
        type: e.type,
        book_slug: e.book_slug,
        chapter_slug: e.chapter_slug ?? null,
        session_id: e.session_id ?? null,
        visitor_id: e.visitor_id ?? null,
        visitor_kind: e.visitor_kind ?? "human",
        referrer: e.referrer ?? null,
        extra: e.extra ?? null,
        ts: isoDaysAgo(e.daysAgo ?? 1),
      });
    }
  });
  insertMany(events);
}

/* Loose result shapes for queryAnalytics — just the fields the tests assert on.
   queryAnalytics returns Record<string, unknown>, so a focused cast keeps the
   assertions typed without pulling in the dashboard's full interface set. */
export interface SignalRow {
  value: string;
  count: number;
}
export interface OverviewResult {
  bookTotals: { completion_rate: number; chapter_views: number; count: number };
  topBooks: Array<{ book_slug: string; completion_rate: number }>;
  bookDailyTrend: Array<{ day: string; count: number }>;
  pageDailyTrend: Array<{ day: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topReferrerCategories: Array<{ category: string; count: number }>;
  pageTotals: { count: number };
  topPages: unknown[];
  visitors: { unique_visitors: number; returning_visitors: number; new_visitors: number };
  signals: { outbound: SignalRow[]; searches: SignalRow[]; notFound: SignalRow[] };
}
export interface BookViewResult {
  dailyTrend: Array<{ day: string; count: number }>;
  chapterStats: Array<{ completion_rate: number }>;
}

/** Build a POST Request for the event ingestion route. */
export function eventRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/analytics/event", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
