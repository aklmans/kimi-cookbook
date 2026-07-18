"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics-client";

/* `.v3-progress` — top reading bar + reading-position persistence.
   Ports assets/v3.js · "Reading progress bar" + "Reading-position
   persistence". */
export function ReadingProgress({ progressKey }: { progressKey: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const storeKey = "kimi:progress:" + progressKey;

    const tick = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + "%";
    };

    let saveTO: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      try {
        localStorage.setItem(storeKey, JSON.stringify({ p, t: Date.now() }));
      } catch {
        /* ignore */
      }
      // Track chapter completion when reader reaches ≥ 90%
      if (p >= 0.9 && progressKey.includes("/")) {
        const slash = progressKey.indexOf("/");
        track({
          type: "chapter_complete",
          bookSlug: progressKey.slice(0, slash),
          chapterSlug: progressKey.slice(slash + 1),
        });
      }
    };
    const onScrollSave = () => {
      clearTimeout(saveTO);
      saveTO = setTimeout(save, 600);
    };

    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    window.addEventListener("scroll", onScrollSave, { passive: true });
    tick();

    // Restore last reading position — skip when the URL carries a
    // hash anchor, the user has already scrolled, or the saved position
    // is near the top (below 10%).
    try {
      if (!window.location.hash && window.scrollY <= 8) {
        const raw = localStorage.getItem(storeKey);
        if (raw) {
          const { p } = JSON.parse(raw);
          if (typeof p === "number" && p >= 0.1 && p <= 0.98) {
            setTimeout(() => {
              const h = document.documentElement;
              const max = h.scrollHeight - h.clientHeight;
              window.scrollTo({
                top: p * max,
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "auto"
                  : "smooth",
              });
            }, 300);
          }
        }
      }
    } catch {
      /* ignore */
    }

    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      window.removeEventListener("scroll", onScrollSave);
      clearTimeout(saveTO);
    };
  }, [progressKey]);

  return <div className="v3-progress" ref={ref} aria-hidden="true" />;
}
