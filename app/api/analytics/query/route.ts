import { queryAnalytics } from "@/lib/db";
import { requireAnalyticsSession } from "@/lib/analytics-auth";

// db.ts uses node-only drivers (better-sqlite3 / libsql); pin the runtime so a
// future edge default can't silently break it.
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await requireAnalyticsSession(req))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawRange = Number(url.searchParams.get("range") || "30");
  const range = Number.isFinite(rawRange)
    ? Math.max(1, Math.min(365, Math.round(rawRange)))
    : 30;
  const view = url.searchParams.get("view") || "overview";
  if (view !== "overview" && view !== "book") {
    return Response.json({ error: "invalid view" }, { status: 400 });
  }
  const bookSlug = url.searchParams.get("bookSlug") || null;
  if (bookSlug && !/^[a-z0-9-]+$/.test(bookSlug)) {
    return Response.json({ error: "invalid bookSlug" }, { status: 400 });
  }

  try {
    const data = await queryAnalytics(view, { range, bookSlug });
    return Response.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    // Surface DB failures to the operator instead of an opaque 500 HTML page.
    // This is an authed operator-only endpoint, so echoing the driver's own
    // message (e.g. missing DATABASE_URL, Turso auth, dropped schema) is safe
    // and actionable. The dashboard renders it in the error banner.
    console.error("[analytics] query failed", error);
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return Response.json({ error: "database", message }, { status: 500 });
  }
}
