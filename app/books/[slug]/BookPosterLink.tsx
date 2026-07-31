"use client";

import { useTheme } from "next-themes";
import { T } from "@/components/T";
import { track } from "@/lib/analytics-client";
import { useHydrated } from "@/lib/use-hydrated";

/* Book-level share-poster entry in the hero actions — same grammar as
   PdfDownloadLink: a plain <a> + download, no throwaway tab. The poster
   is prerendered at build in BOTH themes (poster.png / poster.dark.png,
   like the MP follows its reader's theme) and served immutable, so the
   link carries ?v=<bookModifiedAt> to bust stale caches after content
   updates. Tracked as a BOOK-level poster_download (no chapterSlug —
   the event route accepts poster_download at both surfaces).
   The href is DERIVED AT RENDER TIME: SSR + the hydration render keep
   the light variant (mismatch-free), and once hydrated it follows
   resolvedTheme on every render — no effect, no rAF, so a theme flip
   can never leave the href stale in a non-compositing environment
   (background tab → right-click "save link as" used to get the wrong
   variant). */
export function BookPosterLink({
  slug,
  version,
}: {
  slug: string;
  /** bookModifiedAt — cache-buster on the immutable poster URL. */
  version: string;
}) {
  const { resolvedTheme } = useTheme();
  const hydrated = useHydrated();
  const variant =
    hydrated && resolvedTheme === "dark" ? "poster.dark.png" : "poster.png";

  return (
    <a
      className="book-detail__btn"
      href={`/books/${slug}/${variant}?v=${version}`}
      download={`${slug}-poster.png`}
      onClick={() => track({ type: "poster_download", bookSlug: slug })}
    >
      <T zh="分享海报 ↓" en="Poster ↓" />
    </a>
  );
}
