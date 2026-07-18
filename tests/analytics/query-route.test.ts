import { test, before } from "node:test";
import assert from "node:assert/strict";
import { tempDbPath, openDb } from "./helpers";
import { queryAnalytics } from "@/lib/db";
import { GET } from "@/app/api/analytics/query/route";
import { verifyAnalyticsLogin, createAnalyticsSessionCookie } from "@/lib/analytics-auth";

process.env.DATABASE_URL = tempDbPath();
process.env.ANALYTICS_SECRET = "analytics-tests-secret-please-ignore-32chars";

let cookie = "";
function queryReq(withCookie: boolean) {
  const headers: Record<string, string> = {};
  if (withCookie) headers.cookie = cookie;
  return new Request("http://localhost/api/analytics/query?view=overview&range=30", { headers });
}

before(async () => {
  await queryAnalytics("overview", { range: 1 }); // create schema
  assert.equal(await verifyAnalyticsLogin("aklman", process.env.ANALYTICS_SECRET!), true);
  cookie = (await createAnalyticsSessionCookie()).split(";")[0]; // "name=value"
});

test("rejects a request with no session (401)", async () => {
  const res = await GET(queryReq(false));
  assert.equal(res.status, 401);
});

test("returns analytics data for a valid session (200)", async () => {
  const res = await GET(queryReq(true));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { visitors?: unknown };
  assert.ok(body.visitors !== undefined);
});

test("surfaces a DB failure as a structured 500 (not a silent 200)", async () => {
  // Break the events table (auth table survives so the session still validates).
  const db = openDb(process.env.DATABASE_URL!);
  db.exec("DROP TABLE events");
  db.close();

  const res = await GET(queryReq(true));
  assert.equal(res.status, 500);
  const body = (await res.json()) as { error?: string; message?: string };
  assert.equal(body.error, "database");
  assert.ok(typeof body.message === "string" && body.message.length > 0);
});
