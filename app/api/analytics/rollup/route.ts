import { rollupDailyStats, pruneOldEvents, retentionDays } from "@/lib/db";
import { requireAnalyticsSession, isCronRequest } from "@/lib/analytics-auth";

// db.ts uses node-only drivers (better-sqlite3 / libsql / scrypt); pin the
// runtime so a future edge default can't silently break it.
export const runtime = "nodejs";

/**
 * Rebuild daily_stats and prune raw events past the retention window. Rollup
 * runs BEFORE prune so pruned days' aggregate counts survive in daily_stats.
 *
 * GET  — Vercel Cron (Authorization: Bearer $CRON_SECRET).
 * POST — a logged-in operator triggering it manually from the dashboard.
 * Split by method so a GET can only ever come from the cron secret (a
 * logged-in admin's stray GET/prefetch can't trigger a mutation).
 */
async function runRollupPrune() {
  try {
    const days = retentionDays();
    const rolledUp = await rollupDailyStats();
    const pruned = await pruneOldEvents(days);
    return Response.json({ ok: true, rolledUp, pruned, retentionDays: days });
  } catch (error) {
    console.error("[analytics] rollup/prune failed", error);
    return Response.json(
      { ok: false, error: "rollup_failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  if (!isCronRequest(req)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return runRollupPrune();
}

export async function POST(req: Request) {
  if (!(await requireAnalyticsSession(req))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return runRollupPrune();
}
