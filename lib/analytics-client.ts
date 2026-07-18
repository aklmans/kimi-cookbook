/**
 * Client-side analytics tracker.
 * Fire-and-forget event tracking via sendBeacon / fetch keepalive.
 * Never import from server components.
 */

import type { ClientAnalyticsEvent } from "./analytics-events";

const SESSION_KEY = "kimi:sid";
const VISITOR_KEY = "kimi:vid";

/** Per-tab session id (sessionStorage) — a single reading session; cleared on
    tab close. Groups a reader's activity within one visit. */
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Durable visitor id (localStorage) — a random UUID that persists across tabs,
    reloads and return visits until the reader clears storage. First-party only,
    no PII, never a cookie. This is what makes unique-visitor / returning-reader
    metrics possible; distinct from the per-tab session id above. */
function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

type TrackPayload =
  | {
      type: Exclude<
        ClientAnalyticsEvent,
        | "page_view"
        | "reading_heartbeat"
        | "outbound_click"
        | "search_query"
        | "not_found"
      >;
      bookSlug: string;
      chapterSlug?: string;
    }
  | {
      type: "reading_heartbeat";
      bookSlug: string;
      chapterSlug: string;
      visibleMs: number;
      activeMs: number;
      scrollDepth: number;
    }
  | {
      type: "page_view";
      pageSlug: string;
    }
  // Site-level UX signals — the payload rides in `detail`.
  | { type: "outbound_click"; href: string }
  | { type: "search_query"; query: string }
  | { type: "not_found"; path: string };

/**
 * Dedup: same event type + slug combo fires at most once per page session.
 * page_view events are exempt — users revisit pages across navigations.
 * reading_heartbeat is exempt because it reports periodic engagement.
 */
const sent = new Set<string>();

export function track(payload: TrackPayload): void {
  if (typeof window === "undefined") return;

  // Signal events (outbound_click / search_query / not_found) carry a single
  // free-form payload in `detail`; book / page events carry slugs.
  const detail =
    payload.type === "outbound_click"
      ? payload.href
      : payload.type === "search_query"
        ? payload.query
        : payload.type === "not_found"
          ? payload.path
          : undefined;
  const bookSlug = "bookSlug" in payload ? payload.bookSlug : undefined;
  const pageSlug = payload.type === "page_view" ? payload.pageSlug : undefined;
  const chapterSlug = "chapterSlug" in payload ? payload.chapterSlug : undefined;

  // page_view, reading_heartbeat and search_query skip dedup — respectively:
  // revisits, periodic engagement, and query refinements (the search tracker
  // debounces at the source). Everything else fires at most once per page
  // session per distinct target (slug combo, or detail for signals).
  const dedupExempt =
    payload.type === "page_view" ||
    payload.type === "reading_heartbeat" ||
    payload.type === "search_query";
  if (!dedupExempt) {
    const key =
      detail !== undefined
        ? `${payload.type}:${detail}`
        : `${payload.type}:${bookSlug ?? pageSlug ?? ""}:${chapterSlug ?? ""}`;
    if (sent.has(key)) return;
    sent.add(key);
  }

  const body = JSON.stringify({
    type: payload.type,
    bookSlug,
    pageSlug,
    chapterSlug,
    detail,
    sessionId: getSessionId(),
    visitorId: getVisitorId(),
    referrer: document.referrer || undefined,
    visible_ms:
      payload.type === "reading_heartbeat" ? payload.visibleMs : undefined,
    active_ms:
      payload.type === "reading_heartbeat" ? payload.activeMs : undefined,
    scroll_depth:
      payload.type === "reading_heartbeat" ? payload.scrollDepth : undefined,
  });

  try {
    // sendBeacon is fire-and-forget and survives page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/event",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silently fail — tracking must never break the reader experience
  }
}
