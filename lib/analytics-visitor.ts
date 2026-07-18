export type VisitorKind =
  | "human"
  | "search_bot"
  | "ai_agent"
  | "feed_reader"
  | "bot"
  | "unknown";

export interface VisitorContext {
  visitor_id: string | null;
  visitor_kind: VisitorKind;
  country: string | null;
  region: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
}

type UserAgentContext = Pick<
  VisitorContext,
  "visitor_kind" | "device" | "browser" | "os"
>;

const AI_AGENT_TOKENS = [
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "OAI-SearchBot",
  "CCBot",
  "Bytespider",
  "Applebot-Extended",
];

const SEARCH_BOT_TOKENS = [
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "Applebot",
];

const FEED_READER_TOKENS = ["Feedly", "Inoreader", "NetNewsWire", "Reeder", "RSS"];

function includesToken(userAgent: string, tokens: readonly string[]): boolean {
  const normalized = userAgent.toLowerCase();
  return tokens.some((token) => normalized.includes(token.toLowerCase()));
}

function cleanShortHeader(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  return cleaned || null;
}

export function cleanVisitorId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "string" ? value : String(value);
  const cleaned = raw.trim().slice(0, 128);
  return cleaned || null;
}

function detectDevice(userAgent: string): string {
  if (/ipad|tablet/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent: string): string {
  if (/edg\//i.test(userAgent)) return "Edge";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios|chromium/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Unknown";
}

function detectOs(userAgent: string): string {
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os x|macintosh/i.test(userAgent)) return "macOS";
  if (/android/i.test(userAgent)) return "Android";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown";
}

function classifyKind(
  userAgent: string | null,
  fallbackKind?: VisitorKind,
): VisitorKind {
  if (!userAgent) return fallbackKind ?? "unknown";
  if (includesToken(userAgent, AI_AGENT_TOKENS)) return "ai_agent";
  if (includesToken(userAgent, SEARCH_BOT_TOKENS)) return "search_bot";
  if (includesToken(userAgent, FEED_READER_TOKENS)) return "feed_reader";
  if (/bot|crawler|spider|slurp/i.test(userAgent)) return "bot";
  return fallbackKind ?? "human";
}

export function classifyUserAgent(
  userAgent: string | null,
  opts?: { fallbackKind?: VisitorKind },
): UserAgentContext {
  const visitor_kind = classifyKind(userAgent, opts?.fallbackKind);

  if (!userAgent) {
    return {
      visitor_kind,
      device: "unknown",
      browser: "Unknown",
      os: "Unknown",
    };
  }

  if (visitor_kind !== "human") {
    return {
      visitor_kind,
      device: "bot",
      browser: "Bot",
      os: "Bot",
    };
  }

  return {
    visitor_kind,
    device: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
  };
}

export function visitorContextFromRequest(
  req: Request,
  opts?: { fallbackKind?: VisitorKind; visitorId?: unknown },
): VisitorContext {
  const uaContext = classifyUserAgent(req.headers.get("user-agent"), opts);

  return {
    visitor_id: cleanVisitorId(opts?.visitorId ?? req.headers.get("x-session-id")),
    visitor_kind: uaContext.visitor_kind,
    country: cleanShortHeader(
      req.headers.get("x-vercel-ip-country") ?? req.headers.get("x-country"),
    ),
    region: cleanShortHeader(
      req.headers.get("x-vercel-ip-country-region") ??
        req.headers.get("x-region"),
    ),
    device: uaContext.device,
    browser: uaContext.browser,
    os: uaContext.os,
  };
}
