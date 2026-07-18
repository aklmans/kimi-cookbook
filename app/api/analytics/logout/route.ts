import { clearAnalyticsSessionCookie } from "@/lib/analytics-auth";

// analytics-auth pulls in node-only crypto (scrypt) + DB drivers; pin the
// runtime so a future edge default can't silently break it.
export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearAnalyticsSessionCookie(),
      },
    },
  );
}
