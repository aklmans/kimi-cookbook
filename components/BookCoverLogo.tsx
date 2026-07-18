import type { CSSProperties } from "react";
import KimiColorLogo from "@lobehub/icons/es/Kimi/components/Color";
import KimiTextLogo from "@lobehub/icons/es/Kimi/components/Text";

type BookCoverLogoProps = {
  slug: string;
};

const combinedTextStyle: CSSProperties = {
  color: "var(--cover-combine-text-color)",
};

const combinedTextProps = {
  "aria-hidden": true,
  focusable: false,
  size: "var(--cover-combine-text-size)",
  style: combinedTextStyle,
};

export function BookCoverLogo({ slug }: BookCoverLogoProps) {
  if (slug === "kimi") {
    /* Kimi's brand mark IS a white "K" on a black tile (this is what
       lobehub's Kimi/Avatar + Kimi.Combine render too). Kimi/Color on
       its own is white-on-transparent and vanishes on light surfaces,
       so we sit it in the brand-colored tile ourselves — same lockup as
       the official Combine, but composed with our own `--cover-combine-*`
       sizing so it scales across thumbnail / detail / print (the lobehub
       Combine needs a numeric px size + @lobehub/ui's runtime CSS, which
       this project doesn't load). The tile fills with `--cover-accent`;
       `bookCoverMark` / `CoverArt` set that per context. */
    return (
      <span className="book-cover-logo book-cover-logo--kimi">
        <span className="book-cover-logo__mark">
          <span className="book-cover-logo__tile" aria-hidden="true">
            <KimiColorLogo aria-hidden focusable={false} size="100%" />
          </span>
        </span>
        <span className="book-cover-logo__combined">
          <span
            className="book-cover-logo__tile book-cover-logo__tile--combined"
            aria-hidden="true"
          >
            <KimiColorLogo aria-hidden focusable={false} size="100%" />
          </span>
          <KimiTextLogo {...combinedTextProps} />
        </span>
      </span>
    );
  }

  return null;
}
