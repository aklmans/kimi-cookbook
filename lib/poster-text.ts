/* Shared text-measure helpers for the build-time share posters
   (book-level + chapter-level). The chapter poster keeps its own
   private copies (verified, untouched); the book poster imports these. */

/* Display width in em — CJK ≈ 1, latin ≈ 0.56, space ≈ 0.33. */
export function displayWidthEm(text: string): number {
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 0x2e7f) width += 1;
    else if (ch === " ") width += 0.33;
    else width += 0.56;
  }
  return width;
}

/** Truncate to a display-width budget, reserving 1em for the ellipsis. */
export function truncateEm(text: string, budgetEm: number): string {
  if (displayWidthEm(text) <= budgetEm) return text;
  const budget = budgetEm - 1;
  let out = "";
  let width = 0;
  for (const ch of text) {
    const w = displayWidthEm(ch);
    if (width + w > budget) break;
    out += ch;
    width += w;
  }
  return `${out.trimEnd()}…`;
}
