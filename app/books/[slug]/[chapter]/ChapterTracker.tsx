"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

const HEARTBEAT_INTERVAL_MS = 20 * 1000;
const ACTIVE_WINDOW_MS = 30 * 1000;
const MAX_READING_MS = 60 * 60 * 1000;

function currentScrollDepth(): number {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  if (max <= 0) return 100;
  return Math.min(100, Math.max(0, Math.floor((window.scrollY / max) * 100)));
}

export function ChapterTracker({
  bookSlug,
  chapterSlug,
}: {
  bookSlug: string;
  chapterSlug: string;
}) {
  useEffect(() => {
    track({ type: "chapter_view", bookSlug, chapterSlug });
  }, [bookSlug, chapterSlug]);

  useEffect(() => {
    let lastTickAt = Date.now();
    let lastActivityAt = lastTickAt;
    let visibleMs = 0;
    let activeMs = 0;
    let scrollDepth = currentScrollDepth();
    let lastSentVisibleMs = 0;
    let lastSentActiveMs = 0;
    let lastSentScrollDepth = -1;
    let pageIsVisible = document.visibilityState === "visible";

    const accrue = (now = Date.now(), forceVisible = false) => {
      const previousTickAt = lastTickAt;
      const delta = Math.max(0, now - previousTickAt);
      lastTickAt = now;

      if ((!forceVisible && !pageIsVisible) || delta <= 0) {
        return;
      }
      if (visibleMs >= MAX_READING_MS) return;

      const visibleDelta = Math.min(delta, MAX_READING_MS - visibleMs);
      visibleMs += visibleDelta;

      const activeUntil = lastActivityAt + ACTIVE_WINDOW_MS;
      const activeDelta = Math.max(0, Math.min(now, activeUntil) - previousTickAt);
      activeMs = Math.min(MAX_READING_MS, activeMs + Math.min(activeDelta, visibleDelta));
    };

    const markActivity = () => {
      const now = Date.now();
      accrue(now);
      lastActivityAt = now;
      scrollDepth = Math.max(scrollDepth, currentScrollDepth());
    };

    const flush = (forceVisible = false) => {
      accrue(Date.now(), forceVisible);
      scrollDepth = Math.max(scrollDepth, currentScrollDepth());

      const nextVisibleMs = Math.floor(visibleMs);
      const nextActiveMs = Math.floor(activeMs);
      const nextScrollDepth = Math.floor(scrollDepth);
      const changed =
        nextVisibleMs !== lastSentVisibleMs ||
        nextActiveMs !== lastSentActiveMs ||
        nextScrollDepth !== lastSentScrollDepth;

      if (!changed || (nextVisibleMs <= 0 && nextScrollDepth <= 0)) return;

      track({
        type: "reading_heartbeat",
        bookSlug,
        chapterSlug,
        visibleMs: nextVisibleMs,
        activeMs: nextActiveMs,
        scrollDepth: nextScrollDepth,
      });

      lastSentVisibleMs = nextVisibleMs;
      lastSentActiveMs = nextActiveMs;
      lastSentScrollDepth = nextScrollDepth;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush(pageIsVisible);
        pageIsVisible = false;
      } else {
        pageIsVisible = true;
        lastTickAt = Date.now();
        markActivity();
      }
    };

    const onPageHide = () => {
      flush(pageIsVisible);
      pageIsVisible = false;
    };

    const interval = window.setInterval(() => {
      flush();
    }, HEARTBEAT_INTERVAL_MS);

    window.addEventListener("scroll", markActivity, { passive: true });
    window.addEventListener("pointerdown", markActivity, { passive: true });
    window.addEventListener("click", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("touchstart", markActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      flush(pageIsVisible);
      window.clearInterval(interval);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("click", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("touchstart", markActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [bookSlug, chapterSlug]);

  return null;
}
