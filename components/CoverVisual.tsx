import type { CSSProperties } from "react";

type CoverVisualProps = {
  /** Decorative motif drawn top-left inside the card (e.g. ">_" for Warp).
      Rendered as an HTML overlay so it isn't cropped when the SVG is
      `slice`-scaled. Omit for brands whose scene carries the identity. */
  motif?: string;
  /** Brand-specific scene. "moon" → Kimi's 月之暗面 dark-side moon (Kimi is
      Moonshot AI); default → the flowing-gradient waves. */
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
 * can override any var inline. `variant="moon"` swaps the wave scene for the
 * 月之暗面 dark-side moon (Kimi); everything else keeps the waves.
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

/** Kimi — 月之暗面 (Moonshot's own name IS the cover): a dark-side moon —
    the whole ghost disc faintly visible, one lit paper crescent on the
    right limb — under a hairline orbit with a single satellite in the K
    mark's blue, and a faint horizon arc low on the card. Everything lives
    inside the central band so the `slice` crop on tall cards keeps the
    moon, the orbit's sweep and the satellite. */
function MoonScene() {
  return (
    <>
      <defs>
        <mask id="cv-moon-bite">
          <rect x="-90" y="-90" width="180" height="180" fill="#fff" />
          <circle cx="-14" cy="-6" r="74" fill="#000" />
        </mask>
        <clipPath id="cv-clip">
          <rect x="0" y="0" width="300" height="400" />
        </clipPath>
      </defs>
      <g clipPath="url(#cv-clip)">
        <rect x="0" y="0" width="300" height="400" fill="var(--cv-bg)" />
        <g transform="translate(150 168) scale(0.68)">
          {/* the dark side — a ghost disc, not a sliver */}
          <circle
            r="78"
            fill="var(--cv-1)"
            stroke="var(--cv-3)"
            strokeOpacity="0.07"
            strokeWidth="1"
          />
          {/* the lit crescent — paper moon, bitten back to a thin limb */}
          <circle r="78" fill="var(--cv-3)" mask="url(#cv-moon-bite)" />
          {/* the orbit — one hairline, satellite in the K mark's blue */}
          <ellipse
            rx="118"
            ry="38"
            transform="rotate(-14)"
            fill="none"
            stroke="var(--cv-3)"
            strokeOpacity="0.26"
            strokeWidth="0.8"
          />
          <circle cx="82" cy="-46" r="9" fill="var(--cv-4)" opacity="0.16" />
          <circle cx="82" cy="-46" r="4.6" fill="var(--cv-4)" />
        </g>
        {/* a faint horizon arc low on the card — depth, not decoration */}
        <ellipse
          cx="150"
          cy="384"
          rx="142"
          ry="43"
          fill="none"
          stroke="var(--cv-3)"
          strokeOpacity="0.1"
          strokeWidth="0.8"
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
