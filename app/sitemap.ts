import type { MetadataRoute } from "next";
import { getAllBooks, chapterModifiedAt } from "@/lib/books";
import { absoluteUrl } from "@/lib/site";

/* Sitemap — only published reading surfaces. Drafts are excluded
   because getAllBooks() filters them out and draft chapters are
   skipped below. Internal dashboards, API endpoints, PDF source
   pages, and per-book agent mirrors are intentionally not listed. */

function atMidnightUtc(date: string): Date {
  // Defensive normalization. Revision and book dates may be "YYYY-MM"
  // (month) or "YYYY-MM-DD" (full date). Pad a 7-char "YYYY-MM" to
  // "YYYY-MM-01", and truncate anything longer to its first 10 chars
  // ("YYYY-MM-DD") before composing the UTC timestamp — guarding
  // against stray longer inputs without depending on upstream shape.
  const normalized =
    date.length === 7 ? `${date}-01` : date.slice(0, 10);
  return new Date(`${normalized}T00:00:00Z`);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const books = getAllBooks();
  const newest = books[0];
  const lastSiteUpdate = newest
    ? atMidnightUtc(newest.date)
    : new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: lastSiteUpdate,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: lastSiteUpdate,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/license"),
      lastModified: lastSiteUpdate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/llms.txt"),
      lastModified: lastSiteUpdate,
      changeFrequency: "weekly",
      priority: 0.4,
    },
  ];

  for (const book of books) {
    entries.push({
      url: absoluteUrl(`/books/${book.slug}`),
      lastModified: atMidnightUtc(book.date),
      changeFrequency: "monthly",
      priority: 0.8,
    });

    for (const chapter of book.chapters) {
      // Skip draft chapters — they render a placeholder, not indexable content.
      if (chapter.draft) continue;
      entries.push({
        url: absoluteUrl(`/books/${book.slug}/${chapter.slug}`),
        lastModified: atMidnightUtc(chapterModifiedAt(book, chapter)),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
