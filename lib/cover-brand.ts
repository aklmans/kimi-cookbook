import type { BookMeta } from "./types";

export type CoverBrand = {
  label: string;
  mark: string;
  accent: string;
  hasLobeIcon: boolean;
};

/* Single-book site: only the Kimi brand remains. The fallback below covers
   any future book until it gets its own entry. */
const BOOK_COVER_BRANDS: Record<string, CoverBrand> = {
  kimi: {
    label: "Kimi",
    mark: "KIMI",
    // Pure ink — pairs with Kimi/Color's white-K mark on a black
    // avatar tile. Purple felt off; this reads as the brand mark
    // rather than another colorful product card on the shelf.
    accent: "#1A1A1A",
    hasLobeIcon: true,
  },
};

function fallbackMark(book: Pick<BookMeta, "title" | "titleEn">): string {
  const source = book.titleEn || book.title;
  const ascii = source
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("");

  return (ascii || source).slice(0, 3).toUpperCase();
}

export function coverBrandForBook(
  book: Pick<BookMeta, "slug" | "title" | "titleEn">,
): CoverBrand {
  return (
    BOOK_COVER_BRANDS[book.slug] ?? {
      label: book.titleEn || book.title,
      mark: fallbackMark(book),
      accent: "#C95F3D",
      hasLobeIcon: false,
    }
  );
}
