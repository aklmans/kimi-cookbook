/**
 * In-memory ingestion guards for the public POST /api/analytics/event endpoint.
 *
 * Per-process only: each serverless instance keeps its own window, so this is a
 * cheap first line against a single client hammering the endpoint — not a
 * globally-consistent quota. It pairs with the request body-size cap (below)
 * and the DB-side bot filter + retention prune, which together bound the blast
 * radius. We deliberately avoid IP-based keys (privacy: no IP is ever read or
 * stored), so the key is the client-supplied session / visitor id — enough to
 * throttle a naive flood without a database table or external store. A flood
 * that rotates its id per request can't be throttled per-key by design; the
 * body cap + bot filter + prune are what bound that case.
 */

/** Max accepted request body. Heartbeat payloads are ~300 bytes; 4 KB is a
    generous ceiling that still rejects anything pathological. */
export const MAX_INGEST_BODY_BYTES = 4096;

const WINDOW_MS = 60_000;
/** A real reader emits a heartbeat every ~20s plus a handful of nav events —
    well under 10/min. 120/min per id is generous headroom yet caps a single id
    spamming the endpoint. */
const MAX_EVENTS_PER_WINDOW = 120;
/** Bound the Map so a flood of distinct keys can't grow it without limit. */
const MAX_TRACKED_KEYS = 20_000;

export const INGEST_RATE_LIMIT = {
  windowMs: WINDOW_MS,
  maxPerWindow: MAX_EVENTS_PER_WINDOW,
};

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();
let lastSweep = 0;

function sweepExpired(now: number): void {
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
  // Hard cap: a flood of still-live distinct keys (e.g. rotating ids) can't be
  // throttled per-key anyway, so drop everything rather than grow unbounded.
  if (windows.size > MAX_TRACKED_KEYS) windows.clear();
  lastSweep = now;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets — 0 when allowed. Sent as Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Fixed-window counter keyed on `key`. Allows up to maxPerWindow requests per
 * windowMs; the window opens when a key is first seen (or after it resets).
 * `now` is injectable for tests.
 */
export function checkIngestRateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  // Sweep on a timer or under key pressure so memory stays bounded without
  // scanning the whole Map on every request.
  if (now - lastSweep > WINDOW_MS || windows.size > MAX_TRACKED_KEYS) {
    sweepExpired(now);
  }

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= MAX_EVENTS_PER_WINDOW) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Test hook — clears all in-memory windows. */
export function __resetIngestRateLimit(): void {
  windows.clear();
  lastSweep = 0;
}
