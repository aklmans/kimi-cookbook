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

/* Mini Program reading channel — server-side only (the MP fetches payloads;
   no client JS ever runs there). */
export const MP_ANALYTICS_EVENTS = ["mp_book_open", "mp_chapter_read"] as const;

/* Share-intent actions on the chapter bar: poster downloads plus the two
   high-intent client actions — QR popover opens and Feed-to-AI copies. */
export const SHARE_ANALYTICS_EVENTS = [
  "poster_download",
  "qr_open",
  "agent_prompt_copy",
] as const;

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

export const STATIC_PAGE_SLUGS = ["home", "about", "license", "feed"] as const;

export type BookAnalyticsEvent = (typeof BOOK_ANALYTICS_EVENTS)[number];
export type BookTotalAnalyticsEvent =
  (typeof BOOK_TOTAL_ANALYTICS_EVENTS)[number];
export type PageAnalyticsEvent = (typeof PAGE_ANALYTICS_EVENTS)[number];
export type ReadingAnalyticsEvent = (typeof READING_ANALYTICS_EVENTS)[number];
export type SignalAnalyticsEvent = (typeof SIGNAL_ANALYTICS_EVENTS)[number];
export type MpAnalyticsEvent = (typeof MP_ANALYTICS_EVENTS)[number];
export type ShareAnalyticsEvent = (typeof SHARE_ANALYTICS_EVENTS)[number];
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];
export type ClientAnalyticsEvent =
  | BookAnalyticsEvent
  | ReadingAnalyticsEvent
  | "page_view"
  | SignalAnalyticsEvent
  | "poster_download"
  | "qr_open"
  | "agent_prompt_copy";

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
