"use client";

import { useEffect, useState } from "react";

/* Fixed "back to top" arrow that appears after scrolling past the
   first viewport height.  Positioned in the lower-right corner,
   stacking above the shortcuts hint on desktop. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      className={`back-to-top${visible ? " is-visible" : ""}`}
      /* Static bilingual label — stable across SSR (server renders zh)
         and hydration (an EN reader's pre-paint script sets data-lang=en),
         so no hydration mismatch and the label is correct in both modes. */
      aria-label="回到顶部 / Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        })
      }
    >
      ↑
    </button>
  );
}
