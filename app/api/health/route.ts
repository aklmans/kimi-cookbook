import { getDeploymentHealth } from "@/lib/deployment-health";

/**
 * Unauthenticated deployment-integrity health check.
 *
 * Keep this independent of analytics and other external services. Its job is
 * to prove that the runtime environment, immutable release marker, and Next
 * build all belong to the same git SHA. A separate monitor should cover public
 * DNS/TLS and any external database.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const health = getDeploymentHealth();

  return Response.json(
    health,
    {
      status: health.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
