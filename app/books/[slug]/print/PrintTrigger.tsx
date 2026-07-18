"use client";

import { useEffect } from "react";

/* Auto-fire window.print() when the URL has ?print=1.
   Reads from window.location to avoid useSearchParams — using that
   hook would force the page out of static prerendering (Next 16 docs:
   "a static page that calls useSearchParams from a Client Component
   must be wrapped in a Suspense boundary"). window.location.search
   only runs after hydration, so the page stays fully static. */
export function PrintTrigger() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") !== "1") return;

    let cancelled = false;
    (async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready;
      } catch {
        /* fonts API not available — proceed anyway */
      }
      if (cancelled) return;
      setTimeout(() => {
        if (!cancelled) window.print();
      }, 300);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
