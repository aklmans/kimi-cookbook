/* Auto readTime — 中文按 350 字/分, 英文按 220 词/分; 中英混排取较低者. */
export function calcReadTime(mdx: string): string {
  const cn = (mdx.match(/[一-鿿]/g) || []).length;
  const en = (mdx.match(/[a-zA-Z]+/g) || []).length;
  const mins = Math.max(1, Math.ceil(cn / 350 + en / 220));
  return `${mins} MIN`;
}
