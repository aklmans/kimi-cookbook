/**
 * Shallow, unauthenticated health check for deployment verification.
 *
 * Keep this independent of analytics and other external services: its job is
 * to prove that the expected Next.js release is accepting HTTP requests. A
 * separate monitor should cover public DNS/TLS and any external database.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      ok: true,
      version: process.env.DEPLOYMENT_VERSION || "development",
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
