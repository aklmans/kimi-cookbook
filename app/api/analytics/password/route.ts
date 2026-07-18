import {
  createAnalyticsSessionCookie,
  requireAnalyticsSession,
  updateAnalyticsPassword,
} from "@/lib/analytics-auth";

// analytics-auth pulls in node-only crypto (scrypt) + DB drivers; pin the
// runtime so a future edge default can't silently break it.
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await requireAnalyticsSession(req))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");
    const result = await updateAnalyticsPassword(currentPassword, newPassword);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      { ok: true },
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
