"use client";

import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/use-hydrated";

/* Replaces the prototype's `[data-theme-toggle]` button. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useHydrated();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      className="v3-header__theme"
      data-theme-toggle
      type="button"
      /* Static bilingual label — SSR-safe (see BackToTop). */
      aria-label="切换主题 / Toggle theme"
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <span data-theme-icon suppressHydrationWarning>
        {isDark ? "☾" : "☼"}
      </span>
    </button>
  );
}
