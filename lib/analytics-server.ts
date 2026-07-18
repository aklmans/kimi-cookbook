/**
 * Server-side analytics tracking.
 * Used by route handlers (llms.md, feed.xml) to track server-side reads.
 * Never import from client components.
 */

import { insertEvent } from "./db";
import { classifyUserAgent } from "./analytics-visitor";

export function trackAgentRead(
  bookSlug: string,
  userAgent: string | null,
): void {
  const visitor = classifyUserAgent(userAgent, { fallbackKind: "ai_agent" });

  // Fire-and-forget — don't await, don't block the response.
  // insertEvent's own try/catch handles errors internally.
  insertEvent({
    type: "agent_read",
    book_slug: bookSlug,
    chapter_slug: null,
    session_id: null,
    agent: userAgent?.slice(0, 200) ?? null,
    visitor_id: null,
    visitor_kind: visitor.visitor_kind,
    country: null,
    region: null,
    device: visitor.device,
    browser: visitor.browser,
    os: visitor.os,
  }).catch(() => {});
}

export function trackFeedRead(userAgent: string | null): void {
  const visitor = classifyUserAgent(userAgent, { fallbackKind: "feed_reader" });

  insertEvent({
    type: "feed_read",
    book_slug: "feed",
    chapter_slug: null,
    session_id: null,
    agent: userAgent?.slice(0, 200) ?? null,
    visitor_id: null,
    visitor_kind: visitor.visitor_kind,
    country: null,
    region: null,
    device: visitor.device,
    browser: visitor.browser,
    os: visitor.os,
  }).catch(() => {});
}
