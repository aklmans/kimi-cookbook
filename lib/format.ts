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

const CN_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const CN_TENS = [
  "", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十", "九十",
];

/** Chapter ordinal in Chinese — 一…十…十一…二十…九十九. Past 99 falls
    back to plain digits so chapter 100+ can never render as 「第章」
    (the share poster's old 10-entry lookup did exactly that at
    index ≥ 10). Shared by the chapter cover, the MP renderer, and the
    share poster. */
export function chineseNum(n: number): string {
  if (n < 1) return "";
  if (n > 99) return String(n);
  if (n < 10) return CN_DIGITS[n];
  if (n < 20) return `十${CN_DIGITS[n % 10]}`;
  return CN_TENS[Math.floor(n / 10)] + CN_DIGITS[n % 10];
}
