"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "./T";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangToggle";
import { SearchIcon } from "./SearchIcon";

/* `.v3-header` — README CSS-class map.
   Client component because the sticky header tracks scroll state
   (assets/v3.js · updateHeaderScroll). */
export function SiteHeader({ backHref }: { backHref?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [shortcut, setShortcut] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Platform-correct shortcut hint, set on mount (client-only, so no
  // hydration mismatch — server and first client render show no hint,
  // then this fills it in). Mac uses ⌘K; everyone else uses Ctrl K.
  // Set through a helper call (not a direct setState in the effect
  // body) — same idiom as the scroll effect above — so it runs
  // synchronously on mount regardless of tab visibility.
  useEffect(() => {
    const detectShortcut = () => {
      const isMac = /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
      setShortcut(isMac ? "⌘K" : "Ctrl K");
    };
    detectShortcut();
  }, []);

  return (
    <header className={`v3-header${scrolled ? " is-scrolled" : ""}`}>
      <div className="v3-header__inner">
        <Link className="v3-header__brand" href="/">
          Kimi
        </Link>
        <nav className={`v3-header__nav${backHref ? " has-back" : ""}`}>
          <button
            className="v3-header__search"
            data-search-toggle
            type="button"
            aria-label="搜索 / Search"
          >
            <SearchIcon />
            {shortcut && (
              <kbd className="v3-header__search-kbd" aria-hidden="true">
                {shortcut}
              </kbd>
            )}
          </button>
          {backHref && (
            <Link className="v3-header__back" href={backHref}>
              <T zh="← 目录" en="← Index" />
            </Link>
          )}
          <Link className="v3-header__about" href="/about">
            <T zh="关于" en="About" />
          </Link>
          <LangToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
