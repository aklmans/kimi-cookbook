import { insertEvent } from "@/lib/db";
import { getAllBooks, getChapter } from "@/lib/books";
import { isStaticPageSlug, SIGNAL_BOOK_SLUG } from "@/lib/analytics-events";
import { presentTags, tagSlug } from "@/lib/labels";
import {
  cleanVisitorId,
  visitorContextFromRequest,
} from "@/lib/analytics-visitor";
import {
  checkIngestRateLimit,
  MAX_INGEST_BODY_BYTES,
} from "@/lib/analytics-rate-limit";

// insertEvent uses node-only DB drivers (better-sqlite3 / libsql); pin the
// runtime so a future edge default can't silently break ingestion.
export const runtime = "nodejs";

const VALID_TYPES = new Set([
  "book_view",
  "chapter_view",
  "chapter_complete",
  "pdf_download",
  "page_view",
  "reading_heartbeat",
  "outbound_click",
  "search_query",
  "not_found",
  "qr_open",
  "agent_prompt_copy",
]);
const SIGNAL_TYPES = new Set(["outbound_click", "search_query", "not_found"]);
// Caps for the free-form signal payloads stored in `extra`, keeping cardinality
// (and any junk / PII in a mistyped 404 query string) bounded.
const MAX_SEARCH_QUERY_LEN = 80;
const MAX_NOT_FOUND_PATH_LEN = 200;
const MAX_OUTBOUND_HOST_LEN = 253;
const CHAPTER_TYPES = new Set([
  "chapter_view",
  "chapter_complete",
  "reading_heartbeat",
  "qr_open",
  "agent_prompt_copy",
]);

/* Build the sets of valid tracking targets at module load from the
   published-book manifest. getAllBooks() already filters drafts, so a
   draft book / draft chapter can never pass these checks. */
const publishedBooks = getAllBooks();
const bookBySlug = new Map(publishedBooks.map((b) => [b.slug, b]));
const validTagSlugs = new Set(presentTags(publishedBooks).map(tagSlug));

function validPageSlug(slug: string): boolean {
  if (isStaticPageSlug(slug)) return true;
  // library-tag-<tag> — the tag suffix must be a real tag derived
  // from published books (presentTags), not just any slug-shaped
  // string. e.g. "library-tag-tech" ok, "library-tag-fake" rejected.
  if (slug.startsWith("library-tag-")) {
    const tag = slug.slice("library-tag-".length);
    return tag.length > 0 && validTagSlugs.has(tag);
  }
  return false;
}

/* Referrers are stored as origin + pathname only — query strings and
   fragments are dropped so tracking params, search terms, or stray tokens
   in a referring URL never reach the database. Unparseable values are kept
   as-is (capped), matching the pre-sanitization behavior. */
function sanitizeReferrer(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return value.slice(0, 2048);
    }
    return `${url.origin}${url.pathname}`.slice(0, 2048);
  } catch {
    return value.slice(0, 2048);
  }
}

/* Normalize + bound a signal's payload for storage in `extra`. Returns "" for
   anything unusable (empty, non-http outbound, un-parseable), which the caller
   turns into a 400. Outbound → destination host (external only); search → a
   trimmed, lower-cased, collapsed query; 404 → the pathname only (query / hash
   dropped, so we never persist arbitrary junk or PII from a mistyped URL). */
function sanitizeSignalDetail(type: string, detail: string): string {
  if (!detail) return "";
  if (type === "outbound_click") {
    try {
      const url = new URL(detail);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.hostname.replace(/^www\./, "").slice(0, MAX_OUTBOUND_HOST_LEN);
    } catch {
      return "";
    }
  }
  if (type === "search_query") {
    return detail.replace(/\s+/g, " ").trim().toLowerCase().slice(0, MAX_SEARCH_QUERY_LEN);
  }
  // not_found — keep the path only.
  let path = detail;
  try {
    path = new URL(detail, "http://placeholder.invalid").pathname;
  } catch {
    /* detail wasn't URL-ish; fall back to the raw string (capped below). */
  }
  return path.slice(0, MAX_NOT_FOUND_PATH_LEN);
}

export async function POST(req: Request) {
  try {
    // Size cap: reject oversized bodies before reading them into memory (fast
    // path via Content-Length), then re-check the actual bytes for chunked /
    // header-less requests.
    const declaredLength = Number(req.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_INGEST_BODY_BYTES) {
      return new Response(null, { status: 413 });
    }
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody) > MAX_INGEST_BODY_BYTES) {
      return new Response(null, { status: 413 });
    }
    const body = JSON.parse(rawBody);

    const sessionId = cleanVisitorId(
      body.sessionId ?? req.headers.get("x-session-id"),
    );
    // Durable, first-party visitor id (a localStorage UUID) — distinct from the
    // per-tab session id, and what unique / returning-reader metrics key on.
    // Legacy clients that predate the visitorId field fall back to the session
    // id, so visitor_id is never emptier than it was before.
    const visitorId = cleanVisitorId(body.visitorId) ?? sessionId;

    // Rate-limit per client id (durable visitor first, then session, then a
    // shared "anon" bucket for id-less requests). Fire-and-forget clients ignore
    // the response, so a dropped 429 just discards that one event.
    const limit = checkIngestRateLimit(visitorId ?? sessionId ?? "anon");
    if (!limit.ok) {
      return new Response(null, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }

    const visitorContext = visitorContextFromRequest(req, {
      visitorId,
    });
    const eventVisitorContext = {
      visitor_id: visitorContext.visitor_id,
      visitor_kind: visitorContext.visitor_kind,
      country: visitorContext.country,
      region: visitorContext.region,
      device: visitorContext.device,
      browser: visitorContext.browser,
      os: visitorContext.os,
    };

    if (!body.type || !VALID_TYPES.has(body.type)) {
      return new Response(null, { status: 400 });
    }

    const rawReferrer = sanitizeReferrer(
      body.referrer ? String(body.referrer) : "",
    );

    // Site-level UX signals — no book / page target; the sanitized payload
    // (destination host / normalized query / 404 path) lands in `extra` under a
    // sentinel book_slug so it never mixes into book / page metrics.
    if (SIGNAL_TYPES.has(body.type)) {
      const detail = body.detail != null ? String(body.detail) : "";
      const extra = sanitizeSignalDetail(body.type, detail);
      if (!extra) return new Response(null, { status: 400 });
      await insertEvent({
        type: body.type,
        book_slug: SIGNAL_BOOK_SLUG[body.type as keyof typeof SIGNAL_BOOK_SLUG],
        chapter_slug: null,
        session_id: sessionId,
        referrer: rawReferrer,
        extra,
        ...eventVisitorContext,
      });
      return new Response(null, { status: 204 });
    }

    if (body.type === "page_view") {
      const pageSlug = body.pageSlug ? String(body.pageSlug) : "";
      if (!pageSlug || !validPageSlug(pageSlug)) {
        return new Response(null, { status: 400 });
      }
      await insertEvent({
        type: body.type,
        book_slug: pageSlug,
        chapter_slug: null,
        session_id: sessionId,
        referrer: rawReferrer,
        ...eventVisitorContext,
      });
      return new Response(null, { status: 204 });
    }

    // Book / chapter / pdf events — target must be a published book.
    const bookSlug = body.bookSlug ? String(body.bookSlug) : "";
    if (!bookSlug) return new Response(null, { status: 400 });
    const book = bookBySlug.get(bookSlug);
    if (!book) return new Response(null, { status: 400 });

    const chapterSlug = body.chapterSlug ? String(body.chapterSlug) : null;

    if (CHAPTER_TYPES.has(body.type)) {
      // chapter_view / chapter_complete must point at a real, non-draft
      // chapter of the book. A draft chapter renders a placeholder, so
      // counting views on it would pollute the dashboard.
      if (!chapterSlug) return new Response(null, { status: 400 });
      const found = getChapter(book, chapterSlug);
      if (!found || found.chapter.draft) {
        return new Response(null, { status: 400 });
      }
    } else {
      // book_view / pdf_download don't require a chapter, but if a
      // chapterSlug is supplied it must belong to the book (and not be
      // a draft) — reject arbitrary values so the column stays clean.
      if (chapterSlug) {
        const found = getChapter(book, chapterSlug);
        if (!found || found.chapter.draft) {
          return new Response(null, { status: 400 });
        }
      }
    }

    await insertEvent({
      type: body.type,
      book_slug: bookSlug,
      chapter_slug: chapterSlug,
      session_id: sessionId,
      referrer: rawReferrer,
      visible_ms:
        body.type === "reading_heartbeat"
          ? (body.visible_ms ?? body.visibleMs)
          : null,
      active_ms:
        body.type === "reading_heartbeat"
          ? (body.active_ms ?? body.activeMs)
          : null,
      scroll_depth:
        body.type === "reading_heartbeat"
          ? (body.scroll_depth ?? body.scrollDepth)
          : null,
      ...eventVisitorContext,
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
