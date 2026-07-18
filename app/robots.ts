import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/* robots — allow all public content, keep internal / API / print
   routes out of the index. The sitemap is the canonical discovery
   entry point and only contains published surfaces. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/internal/", "/api/", "/books/*/print"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
