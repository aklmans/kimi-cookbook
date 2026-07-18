import {
  isStaticPageSlug,
  type StaticPageSlug,
} from "./analytics-events";

export interface PageDisplay {
  label: string;
  path: string;
  kind: "page" | "tag" | "feed";
}

const STATIC_PAGE_LABELS: Record<StaticPageSlug, PageDisplay> = {
  home: { label: "Home", path: "/", kind: "page" },
  library: { label: "Library", path: "/library", kind: "page" },
  about: { label: "About", path: "/about", kind: "page" },
  license: { label: "License", path: "/license", kind: "page" },
  feed: { label: "RSS Feed", path: "/feed.xml", kind: "feed" },
};

function titleCase(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function pageLabelForSlug(slug: string): PageDisplay {
  if (isStaticPageSlug(slug)) return STATIC_PAGE_LABELS[slug];
  if (slug.startsWith("library-tag-")) {
    const tag = slug.slice("library-tag-".length);
    return {
      label: `Library · ${titleCase(tag)}`,
      path: `/library/tag/${tag}`,
      kind: "tag",
    };
  }
  return { label: slug, path: "", kind: "page" };
}

export type ReferrerCategory =
  | "Direct"
  | "Internal"
  | "Search"
  | "Social"
  | "AI"
  | "Other";

export function referrerCategory(referrer: string | null): ReferrerCategory {
  if (!referrer) return "Direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host.endsWith("read.wiki") || host.includes("localhost")) {
      return "Internal";
    }
    if (/(google|bing|duckduckgo|baidu|yandex)\./.test(host)) {
      return "Search";
    }
    if (/(x|twitter|linkedin|threads|facebook|reddit)\./.test(host)) {
      return "Social";
    }
    if (/(chatgpt|openai|claude|anthropic|perplexity)\./.test(host)) {
      return "AI";
    }
    return "Other";
  } catch {
    return "Direct";
  }
}
