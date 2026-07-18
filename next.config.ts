import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted production uses Next's minimal Node server. GitHub Actions
  // copies public/ and .next/static beside this output before uploading it.
  output: "standalone",

  // A git SHA is injected by the deployment workflow. During PM2's rolling
  // reload, Next uses this identifier to detect stale clients and force a full
  // navigation instead of mixing assets/RSC payloads from two releases.
  deploymentId: process.env.DEPLOYMENT_VERSION,

  // Vercel serverless and standalone output use file tracing to decide which
  // files land in each production bundle. The dynamic routes below read
  // chapter MDX from the filesystem at request time (not via an
  // import that the tracer can follow statically), so the MDX files
  // must be listed explicitly or these routes 500 in either deployment.
  // A source-tree `next start` already has the files on disk; standalone
  // needs the trace in order to copy them into its minimal output.
  //
  // /search-index.json        — lib/searchIndex.ts fs.readFileSync
  // /books/[slug]/llms.md     — app/books/[slug]/llms.md/route.ts fs.readFile
  //
  // meta.ts files are imported statically via lib/books.ts and are
  // already part of the bundle, so they do not need to be listed.
  outputFileTracingIncludes: {
    "/search-index.json": ["./content/books/**/*.mdx"],
    "/books/[slug]/llms.md": ["./content/books/**/*.mdx"],
    "/api/mp/v1/chapters/[slug]": ["./content/books/**/*.mdx"],
  },
  /* Single-book site: the home page IS the book's intro page. Proxy `/`
     to the book detail route while keeping the URL at `/` (rewrites run
     after the filesystem check, and app/page.tsx is intentionally gone). */
  async rewrites() {
    return [{ source: "/", destination: "/books/kimi" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/internal/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        // The custom giscus theme stylesheets are fetched cross-origin by the
        // giscus.app iframe via a CORS request — without this header the fetch is
        // blocked and giscus silently falls back to its default skin (the comment
        // area then looks off-brand). Allow any origin: these are public, static,
        // credential-free stylesheets.
        source: "/giscus-v3-:mode(light|dark).css",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
