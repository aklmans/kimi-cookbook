"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics-client";
import { useLang } from "@/components/LangProvider";

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
  const [activeHref, setActiveHref] = useState(href);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setActiveHref(lang === "en" && hrefEn ? hrefEn : href);
    });
    return () => cancelAnimationFrame(id);
  }, [href, hrefEn, lang]);

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
