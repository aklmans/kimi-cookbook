/* Satori's dynamic font fallback asks Google Fonts for glyphs that are not in
   the supplied OG fonts. Google returns a 400 font file for U+FFFD, so keep the
   literal replacement character in book content but render it as ASCII in OG. */
export function ogText(value: string | null | undefined): string {
  return (value ?? "").replace(/\uFFFD/g, "U+FFFD");
}
