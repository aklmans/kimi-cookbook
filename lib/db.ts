/**
 * Analytics database abstraction.
 *
 * Driver auto-selection via `DATABASE_URL`:
 * - `libsql://…` or `https://…` → Turso (@libsql/client)
 * - `mysql://…` or `mysqls://…` → MySQL / MariaDB (mysql2/promise)
 * - file path or absent          → local SQLite (better-sqlite3)
 *
 * All drivers expose the same async interface so callers don't need
 * to know which backend is active. Two tables, no ORM. Append-only
 * events + pre-aggregated daily_stats.
 *
 * Portability rules (all three dialects share the query SQL below):
 * string concat is CONCAT(), day bucketing is SUBSTR(ts,1,10) (ts is
 * always an ISO-UTC string), and the daily_stats count column and
 * count aliases stay backticked (MySQL reserves COUNT; SQLite accepts
 * backticks too). Dialect-specific SQL (schema, upserts, REPLACE) is
 * branched on `activeDialect`.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { getAllBooks } from "./books";
import { referrerCategory } from "./analytics-display";
import {
  BOOK_ANALYTICS_EVENTS,
  BOOK_TOTAL_ANALYTICS_EVENTS,
  PAGE_ANALYTICS_EVENTS,
} from "./analytics-events";

export type Dialect = "sqlite" | "libsql" | "mysql";

/** Map a DATABASE_URL to its backend dialect. */
export function dialectFor(url: string): Dialect {
  if (url.startsWith("libsql://") || url.startsWith("https://")) return "libsql";
  if (url.startsWith("mysql://") || url.startsWith("mysqls://")) return "mysql";
  return "sqlite";
}

/** ISO-UTC second string matching the strftime('%Y-%m-%dT%H:%M:%SZ') shape. */
function utcNowString(): string {
  return `${new Date().toISOString().slice(0, 19)}Z`;
}

// ── Types ──

export interface EventInsert {
  type: string;
  book_slug: string;
  chapter_slug: string | null;
  session_id: string | null;
  agent?: string | null;
  referrer?: string | null;
  extra?: string | null;
  visitor_id?: string | null;
  visitor_kind?: string | null;
  country?: string | null;
  region?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  active_ms?: number | null;
  visible_ms?: number | null;
  scroll_depth?: number | null;
}

interface Driver {
  run(sql: string, params: unknown[]): Promise<void>;
  all(sql: string, params: unknown[]): Promise<unknown[]>;
}

type QuickWindowKey = "24h" | "7d" | "30d";

interface QuickWindowRow {
  window: QuickWindowKey;
  current_count: number;
  previous_count: number;
}

type AudienceKey =
  | "visitorKinds"
  | "countries"
  | "regions"
  | "devices"
  | "browsers"
  | "os";

type AudienceColumn =
  | "visitor_kind"
  | "country"
  | "region"
  | "device"
  | "browser"
  | "os";

const quickWindows: { key: QuickWindowKey; days: number }[] = [
  { key: "24h", days: 1 },
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
];

const audienceBreakdowns: { key: AudienceKey; column: AudienceColumn }[] = [
  { key: "visitorKinds", column: "visitor_kind" },
  { key: "countries", column: "country" },
  { key: "regions", column: "region" },
  { key: "devices", column: "device" },
  { key: "browsers", column: "browser" },
  { key: "os", column: "os" },
];

/* Bot exclusion for human-facing metrics. Keeps human + unknown-UA events and
   the explicit `agent_read` / `feed_read` metrics (those ARE AI-agent / RSS
   reads by definition and are reported on their own), but drops JS-crawler
   book/chapter/page views + heartbeats classified as a bot kind. Appended to
   every human-metric WHERE. The Audience breakdown intentionally does NOT use
   this — it shows the full human/bot/agent split so the operator can see it. */
const HUMAN_OR_TRACKED =
  "(visitor_kind IS NULL OR visitor_kind NOT IN ('bot','search_bot','ai_agent','feed_reader') OR type IN ('agent_read','feed_read'))";

/* The strictly-human half of HUMAN_OR_TRACKED — no `type IN (agent_read,
   feed_read)` escape hatch. Used only for unique / returning-visitor counts,
   where an AI-agent or feed reader must NOT be counted as a person even though
   it's a tracked metric elsewhere. Pair with `visitor_id IS NOT NULL`. */
const HUMAN_ONLY =
  "(visitor_kind IS NULL OR visitor_kind NOT IN ('bot','search_bot','ai_agent','feed_reader'))";

// ── Schema ──

const EVENT_COLUMN_MIGRATIONS = [
  { name: "visitor_id", definition: "visitor_id TEXT" },
  { name: "visitor_kind", definition: "visitor_kind TEXT" },
  { name: "country", definition: "country TEXT" },
  { name: "region", definition: "region TEXT" },
  { name: "device", definition: "device TEXT" },
  { name: "browser", definition: "browser TEXT" },
  { name: "os", definition: "os TEXT" },
  { name: "active_ms", definition: "active_ms INTEGER" },
  { name: "visible_ms", definition: "visible_ms INTEGER" },
  { name: "scroll_depth", definition: "scroll_depth INTEGER" },
] as const;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  type         TEXT    NOT NULL,
  book_slug    TEXT    NOT NULL,
  chapter_slug TEXT,
  session_id   TEXT,
  agent        TEXT,
  referrer     TEXT,
  extra        TEXT,
  visitor_id   TEXT,
  visitor_kind TEXT,
  country      TEXT,
  region       TEXT,
  device       TEXT,
  browser      TEXT,
  os           TEXT,
  active_ms    INTEGER,
  visible_ms   INTEGER,
  scroll_depth INTEGER
);

CREATE INDEX IF NOT EXISTS idx_events_type     ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_book     ON events(book_slug);
CREATE INDEX IF NOT EXISTS idx_events_ts       ON events(ts);
-- Composite indexes for the dashboard's real access patterns: the metric
-- queries filter (type, ts) and (book_slug, ts, type); engagement/audience
-- group by session_id. Single-column idx above stay for the prune (ts) and
-- point lookups.
CREATE INDEX IF NOT EXISTS idx_events_type_ts      ON events(type, ts);
CREATE INDEX IF NOT EXISTS idx_events_book_ts_type ON events(book_slug, ts, type);
CREATE INDEX IF NOT EXISTS idx_events_session      ON events(session_id);

CREATE TABLE IF NOT EXISTS daily_stats (
  day          TEXT NOT NULL,
  book_slug    TEXT NOT NULL,
  chapter_slug TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL,
  \`count\`    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, book_slug, chapter_slug, type)
);

CREATE TABLE IF NOT EXISTS analytics_auth (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
`;

/* MySQL / MariaDB variant of the same two tables. Differences: AUTO_INCREMENT
   instead of AUTOINCREMENT, VARCHAR(n) instead of TEXT on indexed columns
   (MySQL cannot index unbounded TEXT), `count` backticked (reserved word),
   and no expression DEFAULT on ts — insertEvent() always sets ts explicitly,
   which keeps us compatible with MySQL < 8.0.13 and MariaDB alike. CREATE
   INDEX has no IF NOT EXISTS in MySQL, so the driver swallows errno 1061
   (duplicate key) when initializing against an existing database. */
const MYSQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  ts           VARCHAR(32) NOT NULL,
  type         VARCHAR(32) NOT NULL,
  book_slug    VARCHAR(64) NOT NULL,
  chapter_slug VARCHAR(64),
  session_id   VARCHAR(64),
  agent        TEXT,
  referrer     TEXT,
  extra        TEXT,
  visitor_id   VARCHAR(64),
  visitor_kind VARCHAR(32),
  country      VARCHAR(64),
  region       VARCHAR(64),
  device       VARCHAR(64),
  browser      VARCHAR(64),
  os           VARCHAR(64),
  active_ms    INT,
  visible_ms   INT,
  scroll_depth INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_events_type         ON events(type);
CREATE INDEX idx_events_book         ON events(book_slug);
CREATE INDEX idx_events_ts           ON events(ts);
CREATE INDEX idx_events_type_ts      ON events(type, ts);
CREATE INDEX idx_events_book_ts_type ON events(book_slug, ts, type);
CREATE INDEX idx_events_session      ON events(session_id);

CREATE TABLE IF NOT EXISTS daily_stats (
  day          VARCHAR(10) NOT NULL,
  book_slug    VARCHAR(64) NOT NULL,
  chapter_slug VARCHAR(64) NOT NULL DEFAULT '',
  type         VARCHAR(32) NOT NULL,
  \`count\`    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, book_slug, chapter_slug, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS analytics_auth (
  username      VARCHAR(128) PRIMARY KEY,
  password_hash TEXT NOT NULL,
  updated_at    VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// ── Driver ──

let driver: Driver | null = null;
let activeDialect: Dialect = "sqlite";

/* Whether a one-shot "production is using local SQLite" warning has
   already been emitted. Avoids spamming the log on every request. */
let warnedLocalProductionDb = false;

/* Whether a one-shot insertEvent() failure log has been emitted.
   Tracking must never break the app, but a silent total outage is
   invisible in production — log the first failure so operators can
   see the DB is unreachable. */
let warnedInsertFailure = false;

/** Split a schema blob into individual statements for drivers that execute
    one statement per call (libsql / mysql; local better-sqlite3 runs the
    whole blob via .exec). Line comments are stripped FIRST: a stray ';'
    inside a `-- comment` would otherwise split off a comment-only chunk,
    which libsql rejects with SQL_PARSE_ERROR ("SQL string does not contain
    any statement") and which aborts schema init. Our schemas have no '--'
    inside string literals, so a blanket line-comment strip is safe. */
export function schemaStatements(dialect: Dialect = "sqlite"): string[] {
  const schema = dialect === "mysql" ? MYSQL_SCHEMA : SCHEMA;
  return schema
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function columnNamesFromPragma(rows: unknown[]): Set<string> {
  const columns = new Set<string>();
  for (const row of rows) {
    const name = (row as { name?: unknown }).name;
    if (typeof name === "string") columns.add(name);
  }
  return columns;
}

function eventColumnMigrationSql(definition: string): string {
  return `ALTER TABLE events ADD COLUMN ${definition}`;
}

async function runEventColumnMigrations(
  listColumns: () => Promise<unknown[]>,
  runSql: (sql: string) => Promise<void>,
): Promise<void> {
  const existingColumns = columnNamesFromPragma(await listColumns());
  for (const column of EVENT_COLUMN_MIGRATIONS) {
    if (existingColumns.has(column.name)) continue;
    await runSql(eventColumnMigrationSql(column.definition));
    existingColumns.add(column.name);
  }
}

function runEventColumnMigrationsSync(sqlite: {
  prepare(sql: string): {
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): unknown;
  };
}): void {
  const existingColumns = columnNamesFromPragma(
    sqlite.prepare("PRAGMA table_info(events)").all(),
  );
  for (const column of EVENT_COLUMN_MIGRATIONS) {
    if (existingColumns.has(column.name)) continue;
    sqlite.prepare(eventColumnMigrationSql(column.definition)).run();
    existingColumns.add(column.name);
  }
}

function normalizeAnalyticsNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : null;
}

function normalizeScrollDepth(value: unknown): number | null {
  const normalized = normalizeAnalyticsNumber(value);
  if (normalized === null) return null;
  return Math.min(100, Math.max(0, normalized));
}

/** One-shot warning when production is running on the default local
    SQLite path. On Vercel / serverless the filesystem is ephemeral or
    read-only, so analytics will silently lose data. */
function warnLocalProductionDb(): void {
  if (warnedLocalProductionDb) return;
  warnedLocalProductionDb = true;
  console.warn(
    "[analytics] Production is using the default local SQLite database " +
      "(./data/analytics.db). On serverless platforms (Vercel) this is " +
      "ephemeral / read-only and analytics will not persist. Set " +
      "DATABASE_URL=libsql://... (Turso) or https://... with " +
      "DATABASE_AUTH_TOKEN for a durable production backend.",
  );
}

function getDriver(): Driver {
  if (driver) return driver;

  const url = process.env.DATABASE_URL || "./data/analytics.db";
  const dialect = dialectFor(url);

  if (dialect === "libsql") {
    // Turso / LibSQL over HTTP — natively async.
    // Run migrations as a tracked promise and gate every query on it
    // so cold-start can't race a query against an unbuilt schema.
    const { createClient } = require("@libsql/client");
    const client = createClient({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });

    const schemaReady = (async () => {
      try {
        for (const stmt of schemaStatements("sqlite")) {
          await client.execute(stmt);
        }
        await runEventColumnMigrations(
          async () => {
            const result = await client.execute("PRAGMA table_info(events)");
            return result.rows;
          },
          async (sql) => {
            await client.execute(sql);
          },
        );
      } catch (error) {
        console.error("[analytics] Failed to initialize Turso schema", error);
        throw error;
      }
    })();

    activeDialect = "libsql";
    driver = {
      run: async (sql: string, params: unknown[]) => {
        await schemaReady;
        await client.execute({ sql, args: params });
      },
      all: async (sql: string, params: unknown[]) => {
        await schemaReady;
        const r = await client.execute({ sql, args: params });
        return r.rows;
      },
    };
  } else if (dialect === "mysql") {
    // MySQL / MariaDB via mysql2/promise. Same gating pattern as libsql:
    // every query awaits the one-time schema init.
    const { createPool } = require("mysql2/promise");
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "");
    const pool = createPool({
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database,
      charset: "utf8mb4",
      waitForConnections: true,
      connectionLimit: 5,
      /* better-sqlite3 returns JS numbers for integer/aggregate columns;
         MySQL sends SUM/AVG/ROUND (NEWDECIMAL) as strings — pull them up
         to numbers so the dashboard's JSON payloads look identical on
         every backend. */
      decimalNumbers: true,
    });

    const schemaReady = (async () => {
      try {
        for (const stmt of schemaStatements("mysql")) {
          try {
            await pool.query(stmt);
          } catch (error) {
            // 1061 = duplicate index on an existing database — idempotent.
            if ((error as { errno?: number }).errno !== 1061) throw error;
          }
        }
        await runEventColumnMigrations(
          async () => {
            const [rows] = await pool.query(
              "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'events'",
              [database],
            );
            return rows as unknown[];
          },
          async (sql) => {
            await pool.query(sql);
          },
        );
      } catch (error) {
        console.error("[analytics] Failed to initialize MySQL schema", error);
        throw error;
      }
    })();

    activeDialect = "mysql";
    driver = {
      run: async (sql: string, params: unknown[]) => {
        await schemaReady;
        await pool.execute(sql, params);
      },
      all: async (sql: string, params: unknown[]) => {
        await schemaReady;
        const [rows] = await pool.execute(sql, params);
        return rows as unknown[];
      },
    };
  } else {
    // Local SQLite via better-sqlite3 — sync, wrapped in Promise.
    if (process.env.NODE_ENV === "production") warnLocalProductionDb();

    const Database = require("better-sqlite3");
    const fs = require("node:fs");
    const pathMod = require("node:path");

    const dir = pathMod.dirname(url);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(url);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.exec(SCHEMA);
    runEventColumnMigrationsSync(sqlite);

    driver = {
      run: async (sql: string, params: unknown[]) => {
        sqlite.prepare(sql).run(...params);
      },
      all: async (sql: string, params: unknown[]) => {
        return sqlite.prepare(sql).all(...params);
      },
    };
  }

  return driver;
}

/** Scalar two-arg min is spelled differently per dialect: MIN(a,b) on
    SQLite/libsql (LEAST doesn't exist there), LEAST(a,b) on MySQL (MIN
    is the aggregate only). Interpolated into the completion_rate clamps;
    activeDialect is set by getDriver() before any query is built. */
function scalarMinFn(): "MIN" | "LEAST" {
  return activeDialect === "mysql" ? "LEAST" : "MIN";
}

// ── Public API ──

export async function insertEvent(row: EventInsert): Promise<void> {
  try {
    // Geo fields are intended to come from platform headers only.
    // Raw IP addresses and IP hashes are intentionally never persisted.
    // ts is set explicitly (not via a DB default) so MySQL < 8.0.13 and
    // MariaDB — which lack expression defaults — behave identically.
    await getDriver().run(
      `INSERT INTO events (
         ts,
         type,
         book_slug,
         chapter_slug,
         session_id,
         agent,
         referrer,
         extra,
         visitor_id,
         visitor_kind,
         country,
         region,
         device,
         browser,
         os,
         active_ms,
         visible_ms,
         scroll_depth
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        utcNowString(),
        row.type,
        row.book_slug,
        row.chapter_slug ?? null,
        row.session_id ?? null,
        row.agent ?? null,
        row.referrer ?? null,
        row.extra ?? null,
        row.visitor_id ?? null,
        row.visitor_kind ?? null,
        row.country ?? null,
        row.region ?? null,
        row.device ?? null,
        row.browser ?? null,
        row.os ?? null,
        normalizeAnalyticsNumber(row.active_ms),
        normalizeAnalyticsNumber(row.visible_ms),
        normalizeScrollDepth(row.scroll_depth),
      ],
    );
  } catch (error) {
    // Never let tracking errors break the app, but log the first one
    // so a silent production outage (unreachable DB, dropped schema)
    // surfaces in the logs instead of vanishing.
    if (!warnedInsertFailure) {
      warnedInsertFailure = true;
      console.warn(
        "[analytics] insertEvent() failed (further failures will be silent):",
        error,
      );
    }
  }
}

export async function getAnalyticsPasswordHash(
  username: string,
): Promise<string | null> {
  const rows = await getDriver().all(
    `SELECT password_hash FROM analytics_auth WHERE username = ? LIMIT 1`,
    [username],
  );
  return (
    (rows[0] as { password_hash?: string } | undefined)?.password_hash ?? null
  );
}

export async function getAnalyticsAuthInfo(
  username: string,
): Promise<{ username: string; updated_at: string } | null> {
  const rows = await getDriver().all(
    `SELECT username, updated_at FROM analytics_auth WHERE username = ? LIMIT 1`,
    [username],
  );
  return (
    (rows[0] as { username: string; updated_at: string } | undefined) ?? null
  );
}

export async function setAnalyticsPasswordHash(
  username: string,
  passwordHash: string,
): Promise<void> {
  // Upsert + timestamp shape are dialect-branched; the timestamp itself is
  // computed here so neither side needs a server-side date function.
  const now = utcNowString();
  await getDriver().run(
    activeDialect === "mysql"
      ? `INSERT INTO analytics_auth (username, password_hash, updated_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash),
           updated_at = VALUES(updated_at)`
      : `INSERT INTO analytics_auth (username, password_hash, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(username) DO UPDATE SET
           password_hash = excluded.password_hash,
           updated_at = excluded.updated_at`,
    [username, passwordHash, now],
  );
}

function placeholders(values: readonly string[]): string {
  return values.map(() => "?").join(", ");
}

/**
 * Quick windows (24h / 7d / 30d) — current vs previous period.
 * Uses a single UNION ALL query to fetch all 6 counts in one round trip.
 */
async function queryQuickWindows(
  d: Driver,
  kinds: "books" | "pages",
  knownBookSlugs: string[],
  bookFilter: string | null | undefined,
): Promise<QuickWindowRow[]> {
  const now = Date.now();
  const bookSlugSql = placeholders(knownBookSlugs);
  const bookTotalTypeSql = placeholders(BOOK_TOTAL_ANALYTICS_EVENTS);
  const pageTypeSql = placeholders(PAGE_ANALYTICS_EVENTS);
  const bookFilterSql = bookFilter ? " AND book_slug = ?" : "";

  // Build 6 SELECT arms (current + previous for each window) via UNION ALL
  const arms: string[] = [];
  const params: unknown[] = [];

  for (const win of quickWindows) {
    const currentSince = new Date(now - win.days * 86400000).toISOString();
    const previousSince = new Date(now - win.days * 2 * 86400000).toISOString();

    if (kinds === "books") {
      arms.push(
        `SELECT '${win.key}' as win, 'current' as period, COUNT(*) as \`count\` FROM events
         WHERE ts >= ? AND book_slug IN (${bookSlugSql})
           AND type IN (${bookTotalTypeSql})${bookFilterSql} AND ${HUMAN_OR_TRACKED}`,
      );
      params.push(currentSince, ...knownBookSlugs, ...BOOK_TOTAL_ANALYTICS_EVENTS, ...(bookFilter ? [bookFilter] : []));

      arms.push(
        `SELECT '${win.key}' as win, 'previous' as period, COUNT(*) as \`count\` FROM events
         WHERE ts >= ? AND ts < ? AND book_slug IN (${bookSlugSql})
           AND type IN (${bookTotalTypeSql})${bookFilterSql} AND ${HUMAN_OR_TRACKED}`,
      );
      params.push(previousSince, currentSince, ...knownBookSlugs, ...BOOK_TOTAL_ANALYTICS_EVENTS, ...(bookFilter ? [bookFilter] : []));
    } else {
      arms.push(
        `SELECT '${win.key}' as win, 'current' as period, COUNT(*) as \`count\` FROM events
         WHERE ts >= ? AND type IN (${pageTypeSql}) AND ${HUMAN_OR_TRACKED}`,
      );
      params.push(currentSince, ...PAGE_ANALYTICS_EVENTS);

      arms.push(
        `SELECT '${win.key}' as win, 'previous' as period, COUNT(*) as \`count\` FROM events
         WHERE ts >= ? AND ts < ? AND type IN (${pageTypeSql}) AND ${HUMAN_OR_TRACKED}`,
      );
      params.push(previousSince, currentSince, ...PAGE_ANALYTICS_EVENTS);
    }
  }

  const rawRows = (await d.all(arms.join(" UNION ALL "), params)) as {
    win: QuickWindowKey;
    period: string;
    count: number;
  }[];

  // Assemble into QuickWindowRow[]
  const map = new Map<QuickWindowKey, { current: number; previous: number }>();
  for (const win of quickWindows) map.set(win.key, { current: 0, previous: 0 });
  for (const r of rawRows) {
    const entry = map.get(r.win);
    if (!entry) continue;
    if (r.period === "current") entry.current = r.count;
    else entry.previous = r.count;
  }

  return quickWindows.map((win) => ({
    window: win.key,
    current_count: map.get(win.key)!.current,
    previous_count: map.get(win.key)!.previous,
  }));
}

async function queryAudienceBreakdowns(
  d: Driver,
  since: string,
  bookFilter: string | null | undefined,
) {
  const result: Record<AudienceKey, unknown[]> = {
    visitorKinds: [],
    countries: [],
    regions: [],
    devices: [],
    browsers: [],
    os: [],
  };

  // Audience intentionally covers all analytics events when no book is
  // selected, so page/feed readers can appear in the distribution. Once
  // a book filter is active, it narrows to that book's events only.
  const scopeSql = bookFilter ? " AND book_slug = ?" : "";
  const scopeParams = bookFilter ? [bookFilter] : [];

  await Promise.all(
    audienceBreakdowns.map(async ({ key, column }) => {
      result[key] = await d.all(
        `SELECT ${column}, COUNT(*) as \`count\`
         FROM (
           SELECT
             ${column},
             COALESCE(session_id, visitor_id, CONCAT('event-', id)) as audience_session_key
           FROM events
           WHERE ts >= ?
             AND ${column} IS NOT NULL
             AND ${column} != ''${scopeSql}
           GROUP BY ${column}, COALESCE(session_id, visitor_id, CONCAT('event-', id))
         ) audience_sessions
         GROUP BY ${column}
         ORDER BY \`count\` DESC, ${column}
         LIMIT 10`,
        [since, ...scopeParams],
      );
    }),
  );

  return result;
}

function heartbeatScope(
  knownBookSlugs: string[],
  bookFilter: string | null | undefined,
) {
  const bookSlugSql = placeholders(knownBookSlugs);
  return {
    where: `type = 'reading_heartbeat' AND ts >= ? AND book_slug IN (${bookSlugSql})${bookFilter ? " AND book_slug = ?" : ""} AND ${HUMAN_OR_TRACKED}`,
    params: [
      ...knownBookSlugs,
      ...(bookFilter ? [bookFilter] : []),
    ],
  };
}

function heartbeatSessionAggregateSql(whereSql: string): string {
  return `SELECT
            COALESCE(session_id, visitor_id, CONCAT('event-', id)) as reading_session_key,
            book_slug,
            chapter_slug,
            COALESCE(MAX(active_ms), 0) as max_active_ms,
            COALESCE(MAX(visible_ms), 0) as max_visible_ms,
            COALESCE(MAX(scroll_depth), 0) as max_scroll_depth
          FROM events
          WHERE ${whereSql}
          GROUP BY
            COALESCE(session_id, visitor_id, CONCAT('event-', id)),
            book_slug,
            chapter_slug`;
}

async function queryEngagement(
  d: Driver,
  since: string,
  knownBookSlugs: string[],
  bookFilter: string | null | undefined,
) {
  const scope = heartbeatScope(knownBookSlugs, bookFilter);
  const rows = await d.all(
    `SELECT
       COUNT(*) as sessions,
       COALESCE(ROUND(AVG(max_active_ms)), 0) as avg_active_ms,
       COALESCE(ROUND(AVG(max_visible_ms)), 0) as avg_visible_ms,
       COALESCE(ROUND(AVG(max_scroll_depth), 1), 0) as avg_scroll_depth,
       COALESCE(SUM(CASE WHEN max_active_ms >= 30000 THEN 1 ELSE 0 END), 0) as engaged_sessions,
       COALESCE(SUM(CASE WHEN max_scroll_depth >= 85 THEN 1 ELSE 0 END), 0) as depth_85_count,
       CASE
         WHEN COUNT(*) > 0
         THEN ROUND(
           COALESCE(SUM(CASE WHEN max_scroll_depth >= 85 THEN 1 ELSE 0 END), 0) * 100.0 /
           COUNT(*),
           1
         )
         ELSE 0
       END as depth_85_rate
     FROM (${heartbeatSessionAggregateSql(scope.where)}) heartbeat_sessions`,
    [since, ...scope.params],
  );

  return (
    (rows[0] as
      | {
          sessions: number;
          avg_active_ms: number;
          avg_visible_ms: number;
          avg_scroll_depth: number;
          engaged_sessions: number;
          depth_85_count: number;
          depth_85_rate: number;
        }
      | undefined) ?? {
      sessions: 0,
      avg_active_ms: 0,
      avg_visible_ms: 0,
      avg_scroll_depth: 0,
      engaged_sessions: 0,
      depth_85_count: 0,
      depth_85_rate: 0,
    }
  );
}

async function queryFunnel(
  d: Driver,
  since: string,
  knownBookSlugs: string[],
  bookFilter: string | null | undefined,
) {
  const bookSlugSql = placeholders(knownBookSlugs);
  const bookFilterSql = bookFilter ? " AND book_slug = ?" : "";
  const bookScopeParams = [
    since,
    ...knownBookSlugs,
    ...(bookFilter ? [bookFilter] : []),
  ];
  const heartbeat = heartbeatScope(knownBookSlugs, bookFilter);

  const [eventRows, heartbeatRows] = await Promise.all([
    d.all(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'book_view' THEN 1 ELSE 0 END), 0) as book_views,
         COALESCE(SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END), 0) as chapter_views,
         COALESCE(SUM(CASE WHEN type = 'chapter_complete' THEN 1 ELSE 0 END), 0) as completions,
         COALESCE(SUM(CASE WHEN type = 'pdf_download' THEN 1 ELSE 0 END), 0) as pdf_downloads,
         COALESCE(SUM(CASE WHEN type = 'agent_read' THEN 1 ELSE 0 END), 0) as agent_reads
       FROM events
       WHERE ts >= ?
         AND book_slug IN (${bookSlugSql})${bookFilterSql}
         AND type IN ('book_view','chapter_view','chapter_complete','pdf_download','agent_read')
         AND ${HUMAN_OR_TRACKED}`,
      bookScopeParams,
    ),
    d.all(
      `SELECT
         COALESCE(SUM(CASE WHEN max_active_ms >= 30000 THEN 1 ELSE 0 END), 0) as engaged_sessions,
         COALESCE(SUM(CASE WHEN max_scroll_depth >= 85 THEN 1 ELSE 0 END), 0) as depth_85_sessions
       FROM (${heartbeatSessionAggregateSql(heartbeat.where)}) heartbeat_sessions`,
      [since, ...heartbeat.params],
    ),
  ]);

  const eventCounts = (eventRows[0] as
    | {
        book_views: number;
        chapter_views: number;
        completions: number;
        pdf_downloads: number;
        agent_reads: number;
      }
    | undefined) ?? {
    book_views: 0,
    chapter_views: 0,
    completions: 0,
    pdf_downloads: 0,
    agent_reads: 0,
  };
  const heartbeatCounts = (heartbeatRows[0] as
    | {
        engaged_sessions: number;
        depth_85_sessions: number;
      }
    | undefined) ?? {
    engaged_sessions: 0,
    depth_85_sessions: 0,
  };

  return {
    book_views: eventCounts.book_views,
    chapter_views: eventCounts.chapter_views,
    engaged_sessions: heartbeatCounts.engaged_sessions,
    depth_85_sessions: heartbeatCounts.depth_85_sessions,
    completions: eventCounts.completions,
    pdf_downloads: eventCounts.pdf_downloads,
    agent_reads: eventCounts.agent_reads,
  };
}

type DailyRow = { day: string; [column: string]: string | number };

/**
 * Dense daily series. SQLite `GROUP BY day` only emits rows for days that had
 * events, leaving gaps that make a trend chart misread the x-axis. Fill every
 * day in [sinceDay, todayDay] (UTC, inclusive): present days keep their row,
 * missing days get a zero row from `emptyRow(day)`.
 */
function zeroFillDailyTrend(
  rows: DailyRow[],
  sinceDay: string,
  todayDay: string,
  emptyRow: (day: string) => DailyRow,
): DailyRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DailyRow[] = [];
  // Iterate UTC midnights (strftime days are UTC too), so DST can't skip/dup a
  // day. Guard caps the loop at the max supported range (365 + slack).
  const cursor = new Date(`${sinceDay}T00:00:00Z`);
  const end = new Date(`${todayDay}T00:00:00Z`);
  for (let guard = 0; cursor <= end && guard <= 366; guard++) {
    const day = cursor.toISOString().slice(0, 10);
    out.push(byDay.get(day) ?? emptyRow(day));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export async function queryAnalytics(
  view: string,
  opts: { range: number; bookSlug?: string | null },
) {
  const since = new Date(Date.now() - opts.range * 86400000)
    .toISOString()
    .slice(0, 10);
  const today = new Date(Date.now()).toISOString().slice(0, 10);
  const d = getDriver();

  if (view === "overview") {
    const knownBookSlugs = getAllBooks().map((b) => b.slug);
    const bookSlugSql = placeholders(knownBookSlugs);
    const bookTypeSql = placeholders(BOOK_ANALYTICS_EVENTS);
    const bookTotalTypeSql = placeholders(BOOK_TOTAL_ANALYTICS_EVENTS);
    const pageTypeSql = placeholders(PAGE_ANALYTICS_EVENTS);
    const bookFilter = opts.bookSlug;
    const bookFilterSql = bookFilter ? " AND book_slug = ?" : "";
    const bookTotalWhere = `ts >= ? AND book_slug IN (${bookSlugSql}) AND type IN (${bookTotalTypeSql})${bookFilterSql} AND ${HUMAN_OR_TRACKED}`;
    const bookEventWhere = `ts >= ? AND book_slug IN (${bookSlugSql}) AND type IN (${bookTypeSql})${bookFilterSql} AND ${HUMAN_OR_TRACKED}`;
    const bookTotalParams = [
      since,
      ...knownBookSlugs,
      ...BOOK_TOTAL_ANALYTICS_EVENTS,
      ...(bookFilter ? [bookFilter] : []),
    ];
    const bookEventParams = [
      since,
      ...knownBookSlugs,
      ...BOOK_ANALYTICS_EVENTS,
      ...(bookFilter ? [bookFilter] : []),
    ];
    const agentWhere = `type = 'agent_read' AND ts >= ? AND book_slug IN (${bookSlugSql})${bookFilterSql}`;
    const agentParams = [
      since,
      ...knownBookSlugs,
      ...(bookFilter ? [bookFilter] : []),
    ];
    // Unique / returning visitors key on the durable visitor_id (localStorage).
    // Scoped to the selected book when filtering; site-wide otherwise (page
    // views included). "Returning" = seen on ≥2 distinct calendar days in range.
    const visitorWhere = `ts >= ? AND visitor_id IS NOT NULL AND ${HUMAN_ONLY}${bookFilterSql}`;
    const visitorParams = [since, ...(bookFilter ? [bookFilter] : [])];
    // Referrers scope to the selected book when filtering (drawn from its
    // book_view / chapter_view events — i.e. how readers reached the book),
    // else site-wide page_view referrers. topReferrers drops null/empty; the
    // category breakdown keeps them (they bucket as "Direct").
    const referrerBaseWhere = bookFilter
      ? `ts >= ? AND book_slug = ? AND type IN ('book_view','chapter_view') AND ${HUMAN_OR_TRACKED}`
      : `ts >= ? AND type = 'page_view' AND ${HUMAN_OR_TRACKED}`;
    const referrerBaseParams = bookFilter ? [since, bookFilter] : [since];
    // Site-level UX signals (outbound host / search query / 404 path) live in
    // `extra` — top N per type, human-only, always site-wide.
    const signalTopSql = `SELECT extra as value, COUNT(*) as \`count\`
       FROM events
       WHERE ts >= ? AND type = ? AND extra IS NOT NULL AND extra != '' AND ${HUMAN_OR_TRACKED}
       GROUP BY extra ORDER BY \`count\` DESC, value LIMIT 15`;

    // Reading channels — the single-book question that actually matters:
    // web reads vs Mini Program vs agent fetches vs RSS, over the range.
    const channelsSql = `SELECT type, COUNT(*) as \`count\`
       FROM events
       WHERE ts >= ? AND type IN ('book_view','chapter_view','mp_chapter_read','agent_read','feed_read')
       GROUP BY type`;
    // Share-intent actions: poster downloads (server) + QR opens / Feed-to-AI
    // copies (client, human-only).
    const shareSql = `SELECT type, COUNT(*) as \`count\`
       FROM events
       WHERE ts >= ? AND type IN ('poster_download','qr_open','agent_prompt_copy') AND ${HUMAN_OR_TRACKED}
       GROUP BY type`;
    const shareTopChaptersSql = `SELECT chapter_slug, COUNT(*) as \`count\`
       FROM events
       WHERE ts >= ? AND type = 'poster_download' AND book_slug = ? AND ${HUMAN_OR_TRACKED}
       GROUP BY chapter_slug ORDER BY \`count\` DESC, chapter_slug LIMIT 10`;

    const [
      bookTotalsRows,
      bookDailyTrend,
      topBooks,
      recentAgents,
      pageTotalsRows,
      pageDailyTrend,
      topPages,
      topReferrers,
      referrerCategoryRows,
      bookQuickWindows,
      pageQuickWindows,
      audience,
      engagement,
      funnel,
      visitorStatsRows,
      signalOutboundRows,
      signalSearchRows,
      signalNotFoundRows,
      channelsRows,
      shareRows,
      shareTopChapterRows,
    ] =
      await Promise.all([
        d.all(
          `SELECT
             COALESCE(SUM(CASE WHEN type = 'book_view' THEN 1 ELSE 0 END), 0) as book_views,
             COALESCE(SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END), 0) as chapter_views,
             COALESCE(SUM(CASE WHEN type = 'chapter_complete' THEN 1 ELSE 0 END), 0) as completions,
             COALESCE(SUM(CASE WHEN type = 'pdf_download' THEN 1 ELSE 0 END), 0) as pdf_downloads,
             COALESCE(SUM(CASE WHEN type = 'agent_read' THEN 1 ELSE 0 END), 0) as agent_reads,
             CASE
               WHEN SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END) > 0
               THEN ${scalarMinFn()}(100, ROUND(
                 SUM(CASE WHEN type = 'chapter_complete' THEN 1 ELSE 0 END) * 100.0 /
                 SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END),
                 1
               ))
               ELSE 0
             END as completion_rate,
             COUNT(*) as \`count\`
           FROM events
           WHERE ${bookTotalWhere}`,
          bookTotalParams,
        ),
        d.all(
          `SELECT SUBSTR(ts, 1, 10) as day,
             SUM(CASE WHEN type = 'book_view' THEN 1 ELSE 0 END) as book_views,
             SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END) as chapter_views,
             SUM(CASE WHEN type = 'chapter_complete' THEN 1 ELSE 0 END) as completions,
             SUM(CASE WHEN type = 'pdf_download' THEN 1 ELSE 0 END) as pdf_downloads,
             SUM(CASE WHEN type = 'agent_read' THEN 1 ELSE 0 END) as agent_reads,
             COUNT(*) as \`count\`
           FROM events
           WHERE ${bookTotalWhere}
           GROUP BY day ORDER BY day`,
          bookTotalParams,
        ),
        d.all(
          `SELECT book_slug,
                  SUM(CASE WHEN type = 'book_view' THEN 1 ELSE 0 END) as book_views,
                  SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END) as chapter_views,
                  SUM(CASE WHEN type = 'chapter_complete' THEN 1 ELSE 0 END) as completions,
                  CASE
                    WHEN SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END) > 0
                    THEN ${scalarMinFn()}(100, ROUND(
                      SUM(CASE WHEN type = 'chapter_complete' THEN 1 ELSE 0 END) * 100.0 /
                      SUM(CASE WHEN type = 'chapter_view' THEN 1 ELSE 0 END),
                      1
                    ))
                    ELSE 0
                  END as completion_rate,
                  COUNT(*) as \`count\`
           FROM events
           WHERE ${bookEventWhere}
           GROUP BY book_slug ORDER BY \`count\` DESC LIMIT 20`,
          bookEventParams,
        ),
        d.all(
          `SELECT book_slug, agent, ts FROM events
           WHERE ${agentWhere}
           ORDER BY ts DESC LIMIT 50`,
          agentParams,
        ),
        d.all(
          `SELECT
             COALESCE(SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END), 0) as page_views,
             COALESCE(SUM(CASE WHEN type = 'feed_read' THEN 1 ELSE 0 END), 0) as feed_reads,
             COUNT(*) as \`count\`
           FROM events
           WHERE ts >= ? AND type IN (${pageTypeSql}) AND ${HUMAN_OR_TRACKED}`,
          [since, ...PAGE_ANALYTICS_EVENTS],
        ),
        d.all(
          `SELECT SUBSTR(ts, 1, 10) as day,
             SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) as page_views,
             SUM(CASE WHEN type = 'feed_read' THEN 1 ELSE 0 END) as feed_reads,
             COUNT(*) as \`count\`
           FROM events
           WHERE ts >= ? AND type IN (${pageTypeSql}) AND ${HUMAN_OR_TRACKED}
           GROUP BY day ORDER BY day`,
          [since, ...PAGE_ANALYTICS_EVENTS],
        ),
        d.all(
          `SELECT book_slug as page_slug,
             SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) as page_views,
             SUM(CASE WHEN type = 'feed_read' THEN 1 ELSE 0 END) as feed_reads,
             COUNT(*) as \`count\`
           FROM events
           WHERE ts >= ? AND type IN (${pageTypeSql}) AND ${HUMAN_OR_TRACKED}
           GROUP BY page_slug
           ORDER BY \`count\` DESC, page_slug LIMIT 20`,
          [since, ...PAGE_ANALYTICS_EVENTS],
        ),
        d.all(
          `SELECT referrer, COUNT(*) as \`count\`
           FROM events
           WHERE ${referrerBaseWhere} AND referrer IS NOT NULL AND referrer != ''
           GROUP BY referrer ORDER BY \`count\` DESC LIMIT 10`,
          referrerBaseParams,
        ),
        d.all(
          `SELECT referrer, COUNT(*) as \`count\`
           FROM events
           WHERE ${referrerBaseWhere}
           GROUP BY referrer`,
          referrerBaseParams,
        ),
        queryQuickWindows(d, "books", knownBookSlugs, bookFilter),
        queryQuickWindows(d, "pages", knownBookSlugs, bookFilter),
        queryAudienceBreakdowns(d, since, bookFilter),
        queryEngagement(d, since, knownBookSlugs, bookFilter),
        queryFunnel(d, since, knownBookSlugs, bookFilter),
        d.all(
          `SELECT
             COUNT(*) as unique_visitors,
             COALESCE(SUM(CASE WHEN active_days >= 2 THEN 1 ELSE 0 END), 0) as returning_visitors
           FROM (
             SELECT visitor_id, COUNT(DISTINCT SUBSTR(ts, 1, 10)) as active_days
             FROM events
             WHERE ${visitorWhere}
             GROUP BY visitor_id
           ) visitor_days`,
          visitorParams,
        ),
        d.all(signalTopSql, [since, "outbound_click"]),
        d.all(signalTopSql, [since, "search_query"]),
        d.all(signalTopSql, [since, "not_found"]),
        d.all(channelsSql, [since]),
        d.all(shareSql, [since]),
        d.all(shareTopChaptersSql, [since, bookFilter ?? knownBookSlugs[0]]),
      ]);

    const referrerCategoryTotals = new Map<string, number>();
    for (const row of referrerCategoryRows as {
      referrer: string | null;
      count: number;
    }[]) {
      const category = referrerCategory(row.referrer);
      referrerCategoryTotals.set(
        category,
        (referrerCategoryTotals.get(category) ?? 0) + row.count,
      );
    }
    const topReferrerCategories = Array.from(referrerCategoryTotals.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const visitorRow = (visitorStatsRows[0] ?? {}) as {
      unique_visitors?: number;
      returning_visitors?: number;
    };
    const uniqueVisitors = Number(visitorRow.unique_visitors ?? 0);
    const returningVisitors = Number(visitorRow.returning_visitors ?? 0);
    const visitors = {
      unique_visitors: uniqueVisitors,
      returning_visitors: returningVisitors,
      // Anyone seen on exactly one day in the range. Clamped at 0 in case a
      // rounding / race ever makes returning momentarily exceed unique.
      new_visitors: Math.max(0, uniqueVisitors - returningVisitors),
    };

    const channels = { web: 0, mp: 0, agent: 0, feed: 0 };
    for (const row of channelsRows as { type: string; count: number }[]) {
      if (row.type === "book_view" || row.type === "chapter_view") {
        channels.web += row.count;
      } else if (row.type === "mp_chapter_read") {
        channels.mp += row.count;
      } else if (row.type === "agent_read") {
        channels.agent += row.count;
      } else if (row.type === "feed_read") {
        channels.feed += row.count;
      }
    }
    const share = {
      poster_download: 0,
      qr_open: 0,
      agent_prompt_copy: 0,
      topChapters: shareTopChapterRows,
    } as {
      poster_download: number;
      qr_open: number;
      agent_prompt_copy: number;
      topChapters: unknown;
    };
    for (const row of shareRows as { type: string; count: number }[]) {
      if (row.type === "poster_download") share.poster_download = row.count;
      else if (row.type === "qr_open") share.qr_open = row.count;
      else if (row.type === "agent_prompt_copy") {
        share.agent_prompt_copy = row.count;
      }
    }

    const result: Record<string, unknown> = {
      bookSlugs: knownBookSlugs.map((book_slug) => ({ book_slug })),
      bookTotals: bookTotalsRows[0],
      bookDailyTrend: zeroFillDailyTrend(
        bookDailyTrend as DailyRow[],
        since,
        today,
        (day) => ({
          day,
          book_views: 0,
          chapter_views: 0,
          completions: 0,
          pdf_downloads: 0,
          agent_reads: 0,
          count: 0,
        }),
      ),
      topBooks,
      recentAgents,
      pageTotals: pageTotalsRows[0],
      pageDailyTrend: zeroFillDailyTrend(
        pageDailyTrend as DailyRow[],
        since,
        today,
        (day) => ({ day, page_views: 0, feed_reads: 0, count: 0 }),
      ),
      topPages,
      topReferrers,
      topReferrerCategories,
      bookQuickWindows,
      pageQuickWindows,
      audience,
      engagement,
      funnel,
      visitors,
      signals: {
        outbound: signalOutboundRows,
        searches: signalSearchRows,
        notFound: signalNotFoundRows,
      },
      channels,
      share,
    };

    if (bookFilter || knownBookSlugs.length === 1) {
      // Single-book site: the chapter funnel is the primary table, so it
      // loads even without an explicit filter (same numbers either way).
      result.chapterStats = await d.all(
        `SELECT chapter_slug,
                SUM(CASE WHEN type='chapter_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN type='chapter_complete' THEN 1 ELSE 0 END) as completions,
                CASE
                  WHEN SUM(CASE WHEN type='chapter_view' THEN 1 ELSE 0 END) > 0
                  THEN ${scalarMinFn()}(100, ROUND(
                    SUM(CASE WHEN type='chapter_complete' THEN 1 ELSE 0 END) * 100.0 /
                    SUM(CASE WHEN type='chapter_view' THEN 1 ELSE 0 END),
                    1
                  ))
                  ELSE 0
                END as completion_rate
         FROM events
         WHERE book_slug = ? AND ts >= ? AND type IN ('chapter_view','chapter_complete') AND ${HUMAN_OR_TRACKED}
         GROUP BY chapter_slug ORDER BY chapter_slug`,
        [bookFilter ?? knownBookSlugs[0], since],
      );
    }

    return result;
  }

  if (view === "book" && opts.bookSlug) {
    const bookTotalTypeSql = placeholders(BOOK_TOTAL_ANALYTICS_EVENTS);
    const [chapterStats, dailyTrend] = await Promise.all([
      d.all(
        `SELECT chapter_slug,
                SUM(CASE WHEN type='chapter_view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN type='chapter_complete' THEN 1 ELSE 0 END) as completions,
                CASE
                  WHEN SUM(CASE WHEN type='chapter_view' THEN 1 ELSE 0 END) > 0
                  THEN ${scalarMinFn()}(100, ROUND(
                    SUM(CASE WHEN type='chapter_complete' THEN 1 ELSE 0 END) * 100.0 /
                    SUM(CASE WHEN type='chapter_view' THEN 1 ELSE 0 END),
                    1
                  ))
                  ELSE 0
                END as completion_rate
         FROM events
         WHERE book_slug = ? AND ts >= ? AND type IN ('chapter_view','chapter_complete') AND ${HUMAN_OR_TRACKED}
         GROUP BY chapter_slug ORDER BY chapter_slug`,
        [opts.bookSlug, since],
      ),
      d.all(
        `SELECT SUBSTR(ts, 1, 10) as day, COUNT(*) as \`count\`
         FROM events
         WHERE book_slug = ? AND ts >= ? AND type IN (${bookTotalTypeSql}) AND ${HUMAN_OR_TRACKED}
         GROUP BY day ORDER BY day`,
        [opts.bookSlug, since, ...BOOK_TOTAL_ANALYTICS_EVENTS],
      ),
    ]);
    return {
      chapterStats,
      dailyTrend: zeroFillDailyTrend(
        dailyTrend as DailyRow[],
        since,
        today,
        (day) => ({ day, count: 0 }),
      ),
    };
  }

  return { error: "invalid view" };
}

/**
 * Rebuild the daily_stats pre-aggregation table.
 *
 * NOTE: queryAnalytics() currently reads from `events` directly.
 * Once event volume grows, switch the dashboard queries to read
 * from `daily_stats` for faster reporting.
 */
export async function rollupDailyStats(): Promise<number> {
  try {
    const d = getDriver();
    // INSERT OR REPLACE (SQLite/libsql) ≡ REPLACE INTO (MySQL).
    const insert =
      activeDialect === "mysql"
        ? "REPLACE INTO daily_stats (day, book_slug, chapter_slug, type, `count`)"
        : "INSERT OR REPLACE INTO daily_stats (day, book_slug, chapter_slug, type, `count`)";
    await d.run(
      `${insert}
       SELECT SUBSTR(ts, 1, 10) as day, book_slug,
              COALESCE(chapter_slug, ''), type, COUNT(*)
       FROM events
       GROUP BY day, book_slug, COALESCE(chapter_slug, ''), type`,
      [],
    );
    const result = await d.all(`SELECT COUNT(*) as cnt FROM daily_stats`, []);
    return (result[0] as { cnt: number })?.cnt ?? 0;
  } catch {
    return 0;
  }
}

/** Default raw-events retention when ANALYTICS_RETENTION_DAYS is unset. */
export const DEFAULT_RETENTION_DAYS = 90;

/** Retention window (days) from ANALYTICS_RETENTION_DAYS, clamped ≥ 1. */
export function retentionDays(): number {
  const raw = Number(process.env.ANALYTICS_RETENTION_DAYS);
  return Number.isFinite(raw) && raw >= 1
    ? Math.floor(raw)
    : DEFAULT_RETENTION_DAYS;
}

/**
 * Delete raw `events` older than `days`. Aggregate counts survive in
 * `daily_stats` — INSERT OR REPLACE only touches days still present in events,
 * so a rollup run *before* this leaves pruned days' rollup rows intact. This is
 * what keeps the events table bounded (heartbeats every 20s dominate volume).
 * Counts the doomed rows first so the number returned is driver-agnostic
 * (`changes()` semantics differ across libsql/sqlite). Throws on DB error so the
 * caller/cron sees failures (unlike the fire-and-forget insert path).
 */
export async function pruneOldEvents(days: number): Promise<number> {
  const window = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - window * 86400000).toISOString();
  const d = getDriver();
  const before = await d.all(
    `SELECT COUNT(*) as cnt FROM events WHERE ts < ?`,
    [cutoff],
  );
  const doomed = (before[0] as { cnt?: number })?.cnt ?? 0;
  if (doomed > 0) {
    await d.run(`DELETE FROM events WHERE ts < ?`, [cutoff]);
  }
  return doomed;
}
