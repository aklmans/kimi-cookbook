import {
  getAnalyticsAccountStatus,
  readAnalyticsSession,
} from "@/lib/analytics-auth";

// analytics-auth pulls in node-only crypto (scrypt) + DB drivers; pin the
// runtime so a future edge default can't silently break it.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await readAnalyticsSession(req);
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  const account = await getAnalyticsAccountStatus();
  return Response.json({
    authenticated: true,
    user: account.user,
    passwordUpdatedAt: account.passwordUpdatedAt,
    expiresAt: session.expiresAt,
    ttlSeconds: session.ttlSeconds,
  });
}
