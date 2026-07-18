import type { CSSProperties } from "react";

type CoverVisualProps = {
  /** Decorative motif drawn top-left inside the card (e.g. ">_" for Warp).
      Rendered as an HTML overlay so it isn't cropped when the SVG is
      `slice`-scaled. Omit for brands whose scene carries the identity. */
  motif?: string;
  /** Brand-specific scene. "moon" → Kimi's Moonshot crescent (Kimi is
      Moonshot AI / 月之暗面); default → the flowing-gradient waves. */
  variant?: "moon";
  className?: string;
  /** Per-brand palette overrides (--cv-bg / --cv-1..4 / --cv-hi). */
  style?: CSSProperties;
};

/**
 * Cover art card. Pure SVG so it's vector (crisp in the PDF at any size) and
 * self-contained (no external asset → print-color-adjust just works). Every
 * colour is a CSS custom property, so it themes per brand:
 *   --cv-bg          card / sky background (dark, brand-tinted)
 *   --cv-1 … --cv-4  scene stops, dark → bright (moon shadow → surface → glow)
 *   --cv-hi          highlight (ribbon tip / stars)
 * Defaults derive from --cover-accent via color-mix (see globals.css); a brand
 * can override any var inline. `variant="moon"` swaps the wave scene for a
 * crescent moon (Kimi); everything else keeps the waves.
 */
export function CoverVisual({
  motif,
  variant,
  className,
  style,
}: CoverVisualProps) {
  return (
    <div
      className={`cover-visual${className ? ` ${className}` : ""}`}
      style={style}
      aria-hidden="true"
    >
      <svg
        className="cover-visual__svg"
        viewBox="0 0 300 400"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {variant === "moon" ? <MoonScene /> : <WaveScene />}
      </svg>
      {/* Motif is an HTML overlay (not SVG text) so it isn't cropped when the
          SVG is `slice`-scaled into a tall / narrow card (e.g. the print jacket). */}
      {motif && <span className="cover-visual__motif">{motif}</span>}
    </div>
  );
}

/** Kimi — a crescent moon on a night sky, lit along the lower-left limb in the
    vivid Kimi blue, with a small companion moon top-right. The whole disc stays
    faintly visible (earthshine) so it reads as a sphere, not a sliver. */
function MoonScene() {
  return (
    <>
      <defs>
        <radialGradient id="cv-moon-lit" cx="0.3" cy="0.66" r="0.95">
          <stop offset="0" stopColor="var(--cv-3)" />
          <stop offset="0.55" stopColor="var(--cv-2)" />
          <stop offset="1" stopColor="var(--cv-1)" />
        </radialGradient>
        <radialGradient id="cv-atmo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.6" stopColor="var(--cv-4)" stopOpacity="0" />
          <stop offset="0.9" stopColor="var(--cv-4)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--cv-4)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cv-horizon" cx="0.5" cy="1" r="0.95">
          <stop offset="0" stopColor="var(--cv-4)" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="var(--cv-bg)" stopOpacity="0" />
        </radialGradient>
        <mask id="cv-crescent">
          <rect x="0" y="0" width="300" height="400" fill="black" />
          <circle cx="150" cy="300" r="150" fill="white" />
          <circle cx="206" cy="262" r="146" fill="black" />
        </mask>
        <clipPath id="cv-clip">
          <rect x="0" y="0" width="300" height="400" />
        </clipPath>
      </defs>
      <g clipPath="url(#cv-clip)">
        <rect x="0" y="0" width="300" height="400" fill="var(--cv-bg)" />
        <rect x="0" y="0" width="300" height="400" fill="url(#cv-horizon)" />
        {/* stars — kept in the central band (x≈78–224) so they survive the
            `slice` crop on a tall card */}
        <g fill="var(--cv-hi)">
          <circle cx="96" cy="66" r="1.4" opacity="0.75" />
          <circle cx="134" cy="42" r="1" opacity="0.5" />
          <circle cx="198" cy="56" r="1.1" opacity="0.6" />
          <circle cx="166" cy="98" r="0.9" opacity="0.45" />
          <circle cx="110" cy="120" r="0.8" opacity="0.4" />
          <circle cx="216" cy="126" r="1" opacity="0.5" />
          <circle cx="82" cy="140" r="0.9" opacity="0.4" />
        </g>
        {/* atmospheric halo behind the moon */}
        <circle cx="150" cy="300" r="176" fill="url(#cv-atmo)" />
        {/* moon disc — earthshine, so the dark side stays a visible sphere */}
        <circle cx="150" cy="300" r="150" fill="var(--cv-1)" />
        {/* lit crescent + a few craters, clipped to the crescent by the mask */}
        <g mask="url(#cv-crescent)">
          <circle cx="150" cy="300" r="150" fill="url(#cv-moon-lit)" />
          <g fill="var(--cv-1)" opacity="0.5">
            <circle cx="92" cy="250" r="15" />
            <circle cx="66" cy="322" r="9" />
            <circle cx="120" cy="356" r="19" />
            <circle cx="150" cy="296" r="6" />
          </g>
        </g>
        {/* Kimi-blue rim light on the lit limb only */}
        <circle
          cx="150"
          cy="300"
          r="149"
          fill="none"
          stroke="var(--cv-4)"
          strokeWidth="2.5"
          opacity="0.6"
          mask="url(#cv-crescent)"
        />
        {/* companion moon, upper-right (inside the safe band) */}
        <circle cx="206" cy="68" r="17" fill="var(--cv-1)" />
        <circle
          cx="206"
          cy="68"
          r="16"
          fill="none"
          stroke="var(--cv-4)"
          strokeWidth="1.3"
          opacity="0.5"
        />
      </g>
    </>
  );
}

/** Default — a flowing-gradient "terminal" wave card (every non-Kimi book). */
function WaveScene() {
  return (
    <>
      <defs>
        <linearGradient id="cv-w1" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" stopColor="var(--cv-1)" />
          <stop offset="1" stopColor="var(--cv-2)" />
        </linearGradient>
        <linearGradient id="cv-w2" x1="0" y1="0" x2="1" y2="0.25">
          <stop offset="0" stopColor="var(--cv-2)" />
          <stop offset="1" stopColor="var(--cv-3)" />
        </linearGradient>
        <linearGradient id="cv-w3" x1="0" y1="0" x2="1" y2="0.2">
          <stop offset="0" stopColor="var(--cv-3)" />
          <stop offset="1" stopColor="var(--cv-4)" />
        </linearGradient>
        <linearGradient id="cv-w4" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--cv-4)" />
          <stop offset="1" stopColor="var(--cv-hi)" />
        </linearGradient>
        <clipPath id="cv-clip">
          <rect x="0" y="0" width="300" height="400" />
        </clipPath>
      </defs>
      <g clipPath="url(#cv-clip)">
        <rect x="0" y="0" width="300" height="400" fill="var(--cv-bg)" />
        <path
          d="M0,205 C60,172 132,236 200,202 C244,180 276,193 300,208 L300,400 L0,400 Z"
          fill="url(#cv-w1)"
          opacity="0.92"
        />
        <path
          d="M0,252 C70,220 150,282 230,248 C266,232 288,244 300,255 L300,400 L0,400 Z"
          fill="url(#cv-w2)"
          opacity="0.9"
        />
        <path
          d="M0,298 C80,268 162,324 242,296 C276,283 291,292 300,301 L300,400 L0,400 Z"
          fill="url(#cv-w3)"
          opacity="0.94"
        />
        <path
          d="M0,338 C86,314 176,350 258,332 C286,325 293,330 300,335 L300,372 C212,356 112,372 0,364 Z"
          fill="url(#cv-w4)"
          opacity="0.85"
        />
      </g>
    </>
  );
}
