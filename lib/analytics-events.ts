export const BOOK_ANALYTICS_EVENTS = [
  "book_view",
  "chapter_view",
  "chapter_complete",
  "pdf_download",
] as const;

export const BOOK_TOTAL_ANALYTICS_EVENTS = [
  ...BOOK_ANALYTICS_EVENTS,
  "agent_read",
] as const;

export const PAGE_ANALYTICS_EVENTS = ["page_view", "feed_read"] as const;

export const READING_ANALYTICS_EVENTS = ["reading_heartbeat"] as const;

/* Site-level UX signals (not tied to a book / page): outbound-link clicks,
   on-site search queries, and 404 hits. Each stores its payload — destination
   host / normalized query / 404 path — in the event `extra` column, under a
   sentinel book_slug so it never mixes into book / page metrics. */
export const SIGNAL_ANALYTICS_EVENTS = [
  "outbound_click",
  "search_query",
  "not_found",
] as const;
export const SIGNAL_BOOK_SLUG: Record<SignalAnalyticsEvent, string> = {
  outbound_click: "_outbound",
  search_query: "_search",
  not_found: "_404",
};

export const STATIC_PAGE_SLUGS = [
  "home",
  "library",
  "about",
  "license",
  "feed",
] as const;

export type BookAnalyticsEvent = (typeof BOOK_ANALYTICS_EVENTS)[number];
export type BookTotalAnalyticsEvent =
  (typeof BOOK_TOTAL_ANALYTICS_EVENTS)[number];
export type PageAnalyticsEvent = (typeof PAGE_ANALYTICS_EVENTS)[number];
export type ReadingAnalyticsEvent = (typeof READING_ANALYTICS_EVENTS)[number];
export type SignalAnalyticsEvent = (typeof SIGNAL_ANALYTICS_EVENTS)[number];
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];
export type ClientAnalyticsEvent =
  | BookAnalyticsEvent
  | ReadingAnalyticsEvent
  | "page_view"
  | SignalAnalyticsEvent;

export function isStaticPageSlug(slug: string): slug is StaticPageSlug {
  return (STATIC_PAGE_SLUGS as readonly string[]).includes(slug);
}

export function analyticsEventGroup(
  type: string,
): "books" | "pages" | "unknown" {
  if ((BOOK_TOTAL_ANALYTICS_EVENTS as readonly string[]).includes(type)) {
    return "books";
  }
  if ((READING_ANALYTICS_EVENTS as readonly string[]).includes(type)) {
    return "books";
  }
  if ((PAGE_ANALYTICS_EVENTS as readonly string[]).includes(type)) {
    return "pages";
  }
  return "unknown";
}
