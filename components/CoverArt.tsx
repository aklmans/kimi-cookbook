import type { CSSProperties, ReactNode } from "react";
import { T } from "@/components/T";

type CoverArtProps = {
  /** Book title (Chinese). */
  title: string;
  /** Book title (English). */
  titleEn: string;
  /** Book subtitle / tagline (Chinese). */
  subtitle?: string;
  /** Book subtitle / tagline (English). */
  subtitleEn?: string;
  /** Tag line or category. */
  tags?: ReactNode;
  /** Product logo or typographic brand mark. */
  logo?: ReactNode;
  /** Product or topic label shown near the mark. */
  brand?: ReactNode;
  /** Optional masthead row pinned to the top (imprint + serial). Only the
      full-bleed print cover passes this; thumbnails leave it off. */
  masthead?: ReactNode;
  /** Brand signature line. */
  sig?: ReactNode;
  /** Accent colour (defaults to CSS --accent). */
  accent?: string;
  /** Aspect ratio override (default 3/4 for book covers). */
  aspect?: string;
};

/**
 * Logo-based fallback for missing book covers.
 * Uses currentColor + CSS variables so it inverts correctly in dark mode.
 * Rendered inside AssetFrame's placeholder slot.
 */
export function CoverArt({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  tags,
  logo,
  brand,
  masthead,
  sig,
  accent = "var(--accent)",
  aspect = "3 / 4",
}: CoverArtProps) {
  const style: CSSProperties = {
    "--cover-accent": accent,
    "--cover-logo-color": accent,
    width: "100%",
    height: "100%",
    aspectRatio: aspect,
    overflow: "hidden",
  } as CSSProperties;

  const defaultSig = <T zh="Kimi x Zhaphar" en="Kimi x Zhaphar" />;

  return (
    <div className="cover-art" style={style} aria-hidden="true">
      <div className="cover-art__inner">
        {masthead && <div className="cover-art__masthead">{masthead}</div>}
        {tags && <div className="cover-art__tag">{tags}</div>}
        <div className="cover-art__rule" />
        <div className="cover-art__logo">{logo}</div>
        {brand && <div className="cover-art__brand">{brand}</div>}
        <div className="cover-art__titles">
          <div className="cover-art__title">
            <T zh={title} en={titleEn || title} />
          </div>
          {/* Same-language subtitle — fills the cover space with the
              book's tagline while keeping each mode monolingual. */}
          {subtitle && (
            <div className="cover-art__subtitle">
              <T zh={subtitle} en={subtitleEn || subtitle} />
            </div>
          )}
        </div>
        <div className="cover-art__sig">{sig ?? defaultSig}</div>
      </div>
    </div>
  );
}
