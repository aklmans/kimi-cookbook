"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/analytics-client";
import { useLang } from "@/components/LangProvider";
import { useHydrated } from "@/lib/use-hydrated";

/* PDF download entry in the hero actions. The lang-aware href is
   derived at render time from the hydration flag + lang (SSR and the
   hydration render both emit the zh href, so no mismatch) — previously
   a rAF-wrapped setState, which stalled in non-compositing
   environments (see lib/use-hydrated). */
export function PdfDownloadLink({
  slug,
  href,
  hrefEn,
  children,
}: {
  slug: string;
  href: string;
  hrefEn?: string;
  children: ReactNode;
}) {
  const { lang } = useLang();
  const hydrated = useHydrated();
  const activeHref = hydrated && lang === "en" && hrefEn ? hrefEn : href;

  return (
    <a
      className="book-detail__btn"
      href={activeHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track({ type: "pdf_download", bookSlug: slug })}
    >
      {children}
    </a>
  );
}
