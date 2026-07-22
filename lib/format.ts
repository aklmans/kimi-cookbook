import type { Revision } from "./types";

export type Lang = "zh" | "en";

/** "6 MIN" -> 6 */
function readMinutes(readTime: string): number {
  const n = parseInt(readTime, 10);
  return Number.isFinite(n) ? n : 0;
}

/** "2026-03" -> "2026.03" */
function dot(date: string): string {
  return date.replace(/-/g, ".");
}

/**
 * Chapter cover byline. README.md §数据层:
 *   revisions[0] is the release, the last item is the latest update.
 * Renders e.g. "6 分钟 · 发布 2026.03 · 更新 2026.05"
 *            /  "6 Min · Released 2026.03 · Updated 2026.05"
 */
export function formatByline(
  readTime: string,
  revisions: Revision[],
  lang: Lang,
): string {
  const n = readMinutes(readTime);
  const parts: string[] = [lang === "zh" ? `${n} 分钟` : `${n} Min`];
  if (revisions && revisions.length) {
    const [first, ...rest] = revisions;
    parts.push(
      lang === "zh"
        ? `发布 ${dot(first.date)}`
        : `Released ${dot(first.date)}`,
    );
    const latest = rest[rest.length - 1];
    if (latest) {
      parts.push(
        lang === "zh"
          ? `更新 ${dot(latest.date)}`
          : `Updated ${dot(latest.date)}`,
      );
    }
  }
  return parts.join(" · ");
}

/** "6 MIN" -> "6 分钟" / "6 Min" */
export function formatReadTime(readTime: string, lang: Lang): string {
  const n = readMinutes(readTime);
  return lang === "zh" ? `${n} 分钟` : `${n} Min`;
}
