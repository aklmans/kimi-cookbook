/* Category / tag display labels — bilingual. */
export const CATEGORY: Record<string, { zh: string; en: string }> = {
  TECH: { zh: "技术", en: "Tech" },
  PRACTICE: { zh: "实践", en: "Practice" },
  ESSAY: { zh: "随笔", en: "Essay" },
  "FIELD-NOTES": { zh: "现场笔记", en: "Field Notes" },
};

export function catZh(c: string): string {
  return CATEGORY[c]?.zh ?? c;
}
export function catEn(c: string): string {
  return CATEGORY[c]?.en ?? c;
}
export function tagsZh(tags: string[]): string {
  return tags.map(catZh).join(" · ");
}
export function tagsEn(tags: string[]): string {
  return tags.map(catEn).join(" · ");
}

/** Book language badge — "zh" | "zh-en". */
export function langLabel(language: string): { zh: string; en: string } {
  return language === "zh"
    ? { zh: "中文", en: "ZH" }
    : { zh: "中英双语", en: "ZH · EN" };
}

/** Tag IDs that at least one of the given books declares, in CATEGORY order.
    Drives both the library filter chips and the tag routes from real books, so
    there's no central tag array to keep in sync and an unused tag never renders
    a dead chip or an empty route. Books are passed in (no getAllBooks import)
    to keep this leaf module free of a cycle. */
export function presentTags(books: { tags: string[] }[]): string[] {
  const have = new Set(books.flatMap((b) => b.tags));
  return Object.keys(CATEGORY).filter((id) => have.has(id));
}

/** Tag ID ("FIELD-NOTES") ↔ URL slug ("field-notes"). */
export function tagSlug(id: string): string {
  return id.toLowerCase();
}
export function tagFromSlug(slug: string): string | undefined {
  return Object.keys(CATEGORY).find((id) => tagSlug(id) === slug);
}
