import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "./helpers";
import { schemaStatements } from "@/lib/db";

/* Guards the libsql / Turso schema-init path. That driver executes SCHEMA one
   statement at a time (local better-sqlite3 runs the whole blob via .exec, so
   it never exercises this). A stray ';' inside a `-- comment` used to split off
   a comment-only chunk, which libsql rejects with SQL_PARSE_ERROR — aborting
   schema init so no events were ever written to Turso. */

test("schemaStatements yields only executable statements — no comment-only chunk", () => {
  const stmts = schemaStatements();
  assert.ok(stmts.length >= 8, "events + indexes + daily_stats + analytics_auth");
  for (const s of stmts) {
    assert.match(s, /^create\b/i, `must be a real CREATE: ${JSON.stringify(s.slice(0, 48))}`);
    assert.doesNotMatch(s, /^\s*--/, "no comment-only statement");
  }
});

test("schemaStatements covers events, daily_stats, analytics_auth + composite indexes", () => {
  const joined = schemaStatements().join("\n").toLowerCase();
  for (const needle of [
    "create table if not exists events",
    "create table if not exists daily_stats",
    "create table if not exists analytics_auth",
    "idx_events_type_ts",
    "idx_events_book_ts_type",
    "idx_events_session",
  ]) {
    assert.ok(joined.includes(needle), `missing from schema: ${needle}`);
  }
});

test("every statement runs standalone (mirrors libsql's one-per-execute)", () => {
  const db = openDb(":memory:");
  try {
    for (const s of schemaStatements()) db.exec(s);
    // Schema is usable afterwards.
    db.prepare("SELECT COUNT(*) FROM events").get();
    db.prepare("SELECT COUNT(*) FROM analytics_auth").get();
  } finally {
    db.close();
  }
});
