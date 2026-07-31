"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { T } from "@/components/T";
import { track } from "@/lib/analytics-client";

/* Book-level share-poster entry in the hero actions — same grammar as
   PdfDownloadLink: a plain <a> + download, no throwaway tab. The poster
   is prerendered at build in BOTH themes (poster.png / poster.dark.png,
   like the MP follows its reader's theme) and served immutable, so the
   link carries ?v=<bookModifiedAt> to bust stale caches after content
   updates. Tracked as a BOOK-level poster_download (no chapterSlug —
   the event route accepts poster_download at both surfaces). */
export function BookPosterLink({
  slug,
  version,
}: {
  slug: string;
  /** bookModifiedAt — cache-buster on the immutable poster URL. */
  version: string;
}) {
  const { resolvedTheme } = useTheme();
  /* SSR + the first client render keep the LIGHT url so hydration
     matches; the theme-correct swap lands a rAF after mount (the same
     pattern as PdfDownloadLink's lang-aware href). */
  const [href, setHref] = useState(`/books/${slug}/poster.png?v=${version}`);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setHref(
        `/books/${slug}/${resolvedTheme === "dark" ? "poster.dark.png" : "poster.png"}?v=${version}`,
      );
    });
    return () => cancelAnimationFrame(id);
  }, [slug, version, resolvedTheme]);

  return (
    <a
      className="book-detail__btn"
      href={href}
      download={`${slug}-poster.png`}
      onClick={() => track({ type: "poster_download", bookSlug: slug })}
    >
      <T zh="分享海报 ↓" en="Poster ↓" />
    </a>
  );
}
