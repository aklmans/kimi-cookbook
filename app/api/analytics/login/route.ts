import {
  createAnalyticsSessionCookie,
  verifyAnalyticsLogin,
} from "@/lib/analytics-auth";

// analytics-auth pulls in node-only crypto (scrypt) + DB drivers; pin the
// runtime so a future edge default can't silently break it.
export const runtime = "nodejs";

/* Lightweight in-memory login failure limiter. Keyed by IP + username
   so a single bad actor can't lock out the one real user from another
   network, and a wrong-username probe is still throttled. In-memory on
   serverless means each instance keeps its own map — not globally
   consistent, but enough to stop casual brute force on a personal
   dashboard without pulling in a DB table or external dependency. */
const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_FAILURE_WINDOW_MS = 10 * 60 * 1000;

type LoginAttempt = { count: number; resetAt: number };
const loginAttempts = new Map<string, LoginAttempt>();

function clientIp(req: Request): string {
  // x-forwarded-for may carry a chain; the leftmost entry is the
  // original client. Fall back to x-real-ip, then to "local".
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xreal = req.headers.get("x-real-ip");
  if (xreal) return xreal.trim();
  return "local";
}

function attemptKey(ip: string, username: string): string {
  return `${ip}:${username}`;
}

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now >= entry.resetAt) return false;
  return entry.count >= LOGIN_FAILURE_LIMIT;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + LOGIN_FAILURE_WINDOW_MS,
    });
    return;
  }
  entry.count += 1;
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "");
    const password = String(body.password ?? "");
    const key = attemptKey(clientIp(req), username);

    if (tooManyAttempts(key)) {
      // Return a generic lockout response; don't reveal whether the
      // username exists or which credential failed.
      return Response.json({ error: "too many attempts" }, { status: 429 });
    }

    if (!(await verifyAnalyticsLogin(username, password))) {
      recordFailure(key);
      return Response.json({ error: "invalid credentials" }, { status: 401 });
    }

    clearAttempts(key);
    return Response.json(
      { ok: true, user: username },
      {
        headers: {
          "Set-Cookie": await createAnalyticsSessionCookie(),
        },
      },
    );
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
}
