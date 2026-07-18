"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "./T";
import { ThemeToggle } from "./ThemeToggle";
import { LangToggle } from "./LangToggle";
import { SearchIcon } from "./SearchIcon";

/* The site's own mark — NOT the official Kimi "K" tile (that's the product's
   logo, and the book cover carries it already). The header mark riffs on the
   book's 月之暗面 cover: a black rounded tile holding the paper crescent and
   the one satellite in Kimi blue. Same composition as favicon.svg. */
function SiteLogo() {
  return (
    <svg
      className="v3-header__logo"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        className="logo-ring"
        x="0.5"
        y="0.5"
        width="47"
        height="47"
        rx="10.5"
        fill="#0E0E13"
      />
      <mask id="v3-header-moon-bite">
        <rect x="6" y="6" width="36" height="36" fill="#fff" />
        <circle cx="21.6" cy="23" r="12.8" fill="#000" />
      </mask>
      <circle cx="24" cy="24" r="13.5" fill="#1B1B25" />
      <circle cx="24" cy="24" r="13.5" fill="#EFE8DC" mask="url(#v3-header-moon-bite)" />
      <circle cx="35.5" cy="13.5" r="4.4" fill="#1783FF" opacity="0.18" />
      <circle cx="35.5" cy="13.5" r="2.6" fill="#1783FF" />
    </svg>
  );
}

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
          <SiteLogo />
          <span>Kimi Cookbook</span>
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
