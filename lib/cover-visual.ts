import type { CSSProperties } from "react";

/* Per-brand overrides for the flowing-gradient <CoverVisual>. A brand only
   needs an entry when the accent-derived default (globals.css color-mix from
   --cover-accent) isn't the look we want.

   Kimi is Moonshot AI (月之暗面) — so its cover is a crescent moon on a night
   sky, lit along the lower-left limb in the vivid Kimi blue, with a small
   companion moon. Black sky + grey moon + Kimi blue + white stars = the
   brand's black / white / blue / grey, and the moon makes it unmistakably
   Kimi. The mark (white "K" on a black tile) stays on the cover-card strip.
   (Kimi's near-ink accent would derive a dull grey from the color-mix
   default, so it ships an explicit palette.)
     --cv-bg night sky · --cv-1 moon shadow · --cv-2 moon mid · --cv-3 moon lit
     · --cv-4 Kimi blue (rim + atmosphere) · --cv-hi stars */
type VisualConfig = {
  motif?: string;
  /** Brand-specific scene for <CoverVisual> ("moon" = Kimi's crescent). */
  variant?: "moon";
  vars?: Record<string, string>;
};

const COVER_VISUALS: Record<string, VisualConfig> = {
  kimi: {
    variant: "moon",
    vars: {
      "--cv-bg": "#06080E",
      "--cv-1": "#151B25",
      "--cv-2": "#4A5563",
      "--cv-3": "#BAC6D3",
      "--cv-4": "#2E86FF",
      "--cv-hi": "#E6EEF8",
    },
  },
};

/** Props for <CoverVisual> for a given book — a motif (optional) and the inline
    palette vars (empty → the CSS defaults derive everything from --cover-accent). */
export function coverVisualFor(slug: string): {
  motif?: string;
  variant?: "moon";
  style?: CSSProperties;
} {
  const cfg = COVER_VISUALS[slug];
  if (!cfg) return {};
  return {
    motif: cfg.motif,
    variant: cfg.variant,
    style: cfg.vars as CSSProperties | undefined,
  };
}
