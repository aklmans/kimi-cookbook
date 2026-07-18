import type { CSSProperties } from "react";

/* Per-brand overrides for the flowing-gradient <CoverVisual>. A brand only
   needs an entry when the accent-derived default (globals.css color-mix from
   --cover-accent) isn't the look we want.

   Kimi is Moonshot AI — 月之暗面, the company name IS the cover: a
   dark-side moon (ghost disc + one lit paper crescent) under a hairline
   orbit, with one satellite in the K mark's own blue. True black field,
   paper moon, one blue — no purple. The mark stays on the cover-card strip.
   (Kimi's near-ink accent would derive a dull grey from the color-mix
   default, so it ships an explicit palette.)
     --cv-bg night field · --cv-1 the dark side (ghost disc)
     · --cv-3 moon paper (crescent + orbit) · --cv-4 Kimi blue (satellite)
     · --cv-2 / --cv-hi unused by the moon scene (kept for the ramp's shape) */
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
      "--cv-bg": "#0E0E13",
      "--cv-1": "#1B1B25",
      "--cv-2": "#4A5563",
      "--cv-3": "#EFE8DC",
      "--cv-4": "#1783FF",
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
