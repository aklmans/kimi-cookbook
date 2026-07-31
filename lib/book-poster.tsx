import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import {
  getAllBooks,
  bookDateShort,
  chapterNumber,
} from "@/lib/books";
import { tagsZh } from "@/lib/labels";
import { ogText } from "@/lib/og-text";
import { displayWidthEm, truncateEm } from "@/lib/poster-text";
import { absoluteUrl, SITE_HOST, SITE_NAME } from "@/lib/site";
import type { BookMeta } from "@/lib/types";

/* Renderer for the WHOLE-book share poster — mirrors the Mini Program's
   drawBookPoster (miniapp utils/poster.js) block for block, so the web
   download and the MP share sheet hand out the same image:
   masthead (accent dash + spaced mono brand + NO. serial + hairline) →
   rounded cover card (the 月之暗面 moon scene, theme-stable dark in BOTH
   palettes, with the "Think clearly. Build with Kimi." tagline overlaid)
   → mono eyebrow (tags) → serif title capped at two lines with the
   accent stop-dot → muted lede (≤3 lines) → 3-column stats with vertical
   separators (章节/更新/作者) → footer band (full title + host + build
   date left, QR right). The MP draws the home 小程序码; the web poster
   keeps the chapter poster's convention — a URL QR to the book page —
   because the MP-code endpoint needs WeChat credentials that don't
   exist at build time.
   Themes: "light" (paper) and "dark" (night), same grammar, two
   prerendered routes (poster.png / poster.dark.png); the hero link
   picks per the reader's theme, like the MP follows its reader. */

const W = 900;
const MARGIN = 96;
const RIGHT = 804;
const FOOTER = 214;
const CONTENT_W = RIGHT - MARGIN; // 708

const ACCENT = "#1783FF";
const NIGHT = "#0E0E13";
const MOON = "#EFE8DC";

interface Palette {
  bg: string;
  ink: string;
  brand: string;
  muted: string;
  border: string;
  lede: string;
  soft: string;
}

/* Palettes straight from drawBookPoster's D_LIGHT / D. The eyebrow stays
   #8A8A8A in BOTH themes (the MP hardcodes D.muted there). */
const LIGHT: Palette = {
  bg: "#FAFAFA",
  ink: "#1A1A1A",
  brand: "#1A1A1A",
  muted: "#6B6B6B",
  border: "#C0BFBA",
  lede: "#3A3A3A",
  soft: "rgba(58,58,58,0.34)",
};
const DARK: Palette = {
  bg: "#0E0E13",
  ink: "#FAFAFA",
  brand: "#EFE8DC",
  muted: "#8A8A8A",
  border: "#3A3A3A",
  lede: "#B8B8B8",
  soft: "rgba(239,232,220,0.22)",
};

/* The 月之暗面 scene from components/CoverVisual.tsx (MoonScene),
   serialized by hand with Kimi's palette (lib/cover-visual.ts) inlined —
   Satori only takes SVG through <img> and CSS vars don't resolve there.
   Keep in sync with MoonScene when the cover art changes. The portrait
   scene is slice-cropped into the landscape card (oversized <img> inside
   an overflow-hidden rounded box), same as the web cover card. */
function moonDataUri(): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">` +
    `<defs>` +
    `<mask id="cv-moon-bite"><rect x="-90" y="-90" width="180" height="180" fill="#fff"/><circle cx="-14" cy="-6" r="74" fill="#000"/></mask>` +
    `<clipPath id="cv-clip"><rect x="0" y="0" width="300" height="400"/></clipPath>` +
    `</defs>` +
    `<g clip-path="url(#cv-clip)">` +
    `<rect x="0" y="0" width="300" height="400" fill="${NIGHT}"/>` +
    `<g transform="translate(150 168) scale(0.68)">` +
    `<circle r="78" fill="#1B1B25" stroke="${MOON}" stroke-opacity="0.07" stroke-width="1"/>` +
    `<circle r="78" fill="${MOON}" mask="url(#cv-moon-bite)"/>` +
    `<ellipse rx="118" ry="38" transform="rotate(-14)" fill="none" stroke="${MOON}" stroke-opacity="0.26" stroke-width="0.8"/>` +
    `<circle cx="82" cy="-46" r="9" fill="${ACCENT}" opacity="0.16"/>` +
    `<circle cx="82" cy="-46" r="4.6" fill="${ACCENT}"/>` +
    `</g>` +
    `<ellipse cx="150" cy="384" rx="142" ry="43" fill="none" stroke="${MOON}" stroke-opacity="0.1" stroke-width="0.8"/>` +
    `</g></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/* Rough wrapped-line guess — ONLY used to pick the title size and pad
   the canvas height H (same 0.92 safety as the chapter poster). */
function estLines(text: string, perLineEm: number, cap: number): number {
  return Math.max(
    1,
    Math.min(cap, Math.ceil(displayWidthEm(text) / (perLineEm * 0.92))),
  );
}

export async function renderBookPoster(
  book: BookMeta,
  theme: "light" | "dark",
): Promise<ImageResponse> {
  const Q = theme === "dark" ? DARK : LIGHT;

  const catalog = chapterNumber(
    Math.max(
      0,
      getAllBooks().findIndex((b) => b.slug === book.slug),
    ),
  );
  const eyebrow = `— ${ogText(tagsZh(book.tags))}`;

  /* Title ladder (the MP's rule): try 56 → 48 → 42, take the first size
     whose estimate wraps to ≤2 lines; truncate with an ellipsis as the
     final guard. coverTitle carries no brand prefix (the masthead +
     footer brand line own that). One-liners reserve 40px so the stop-dot
     never paints past the margin. */
  const rawTitle = ogText(book.coverTitle || book.title);
  let titleSize = 56;
  for (const s of [56, 48, 42]) {
    titleSize = s;
    if (estLines(rawTitle, CONTENT_W / s, 3) <= 2) break;
  }
  const titleOneLiner = estLines(rawTitle, CONTENT_W / titleSize, 2) === 1;
  const title = truncateEm(
    rawTitle,
    titleOneLiner
      ? (CONTENT_W - 40) / titleSize
      : (CONTENT_W / titleSize) * 2,
  );
  const titleLH = Math.round(titleSize * 1.3);
  const titleLines = titleOneLiner ? 1 : 2;
  /* The stop-dot is glued INLINE after the last glyph (flex row), so its
     anchor never depends on a width estimate; only on one-line titles
     that don't close themselves (a native 。!?… already closes it). */
  const showDot = titleOneLiner && !/[。!?…；，、：:;,.!?…]$/.test(title.trim());

  const lede = truncateEm(
    ogText(book.lede || book.description),
    (CONTENT_W / 25) * 3 - 3, // three lines at 25px, minus real-glyph slack
  );
  const ledeLines = estLines(lede, CONTENT_W / 25, 3);

  /* Baseline arithmetic mirrored from drawBookPoster (block tops are the
     MP baselines minus their font size). */
  const coverTop = 216;
  const coverH = Math.round((CONTENT_W * 920) / 1308); // 498
  const coverBottom = coverTop + coverH;
  const eyebrowY = coverBottom + 100;
  const titleFirstBaseline = eyebrowY + 86;
  const titleEndY = titleFirstBaseline + (titleLines - 1) * titleLH;
  const ledeTop = titleEndY + 56;
  const ledeEndY = ledeTop + (ledeLines - 1) * 42;
  const statsTop = ledeEndY + 56;
  const footerY = statsTop + 158;
  const H = footerY + FOOTER;

  const published = book.chapters.filter((c) => !c.draft);
  const stats: { label: string; value: string; desc: string }[] = [
    {
      label: "章节",
      value: String(published.length),
      desc: `约 ${book.readMinutes} 分钟`,
    },
    { label: "更新", value: bookDateShort(book.date), desc: "" },
    { label: "作者", value: ogText(book.author), desc: "写代码,也写字" },
  ];
  const today = new Date();
  const stamp = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  /* URL QR to the book page. Modules follow the palette ink (dark ink on
     light paper, light ink on the night field) — a dark-on-dark code
     would neither show nor scan. */
  const qrDataUrl = await QRCode.toDataURL(absoluteUrl(`/books/${book.slug}`), {
    margin: 0,
    width: 264,
    errorCorrectionLevel: "M",
    color: { dark: Q.ink, light: "#0000" },
  });

  /* Poster fonts are ALL local subset TTFs (npm run gen:font) — nothing
     is fetched from Google Fonts at build time. */
  const serif600 = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts", "TsangerJinKai02-W05.poster.ttf"),
  );
  const serif400 = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts", "TsangerJinKai02-W04.poster.ttf"),
  );
  const mono600 = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts", "JetBrainsMono-SemiBold.poster.ttf"),
  );

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        display: "flex",
        background: Q.bg,
        color: Q.ink,
        fontFamily: "TsangerJinKai",
      }}
    >
      {/* masthead — accent dash + spaced mono brand + serial, hairline */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 128,
          width: 42,
          height: 3,
          background: ACCENT,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: MARGIN + 66,
          top: 121,
          fontFamily: "JetBrains Mono",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 4,
          color: Q.brand,
        }}
      >
        {SITE_NAME.toUpperCase()}
      </div>
      <div
        style={{
          position: "absolute",
          right: MARGIN,
          top: 121,
          fontFamily: "JetBrains Mono",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 4,
          color: Q.muted,
        }}
      >
        {`NO. ${catalog}`}
      </div>
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 176,
          width: CONTENT_W,
          height: 1,
          background: Q.soft,
        }}
      />

      {/* cover card — rounded clip over the moon scene (theme-stable
          dark in both palettes), tagline overlaid at its bottom band */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: coverTop,
          width: CONTENT_W,
          height: coverH,
          display: "flex",
          borderRadius: 18,
          overflow: "hidden",
          background: NIGHT,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={moonDataUri()}
          width={708}
          height={944}
          alt=""
          style={{ position: "absolute", left: 0, top: -180 }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 34,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 600,
          }}
        >
          {/* nbsp — Satori collapses a trailing space before the next span */}
          <span style={{ color: MOON }}>{"Think clearly. Build with "}</span>
          <span style={{ color: ACCENT }}>Kimi</span>
          <span style={{ color: MOON }}>.</span>
        </div>
      </div>

      {/* eyebrow — the MP pins this to D.muted in BOTH themes */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: eyebrowY - 14,
          fontFamily: "JetBrains Mono",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 3,
          color: DARK.muted,
        }}
      >
        {eyebrow}
      </div>

      {/* title + inline stop-dot */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: titleFirstBaseline - titleSize,
          width: CONTENT_W,
          height: titleLines * titleLH,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          whiteSpace: titleOneLiner ? "nowrap" : "normal",
          fontSize: titleSize,
          fontWeight: 600,
          lineHeight: titleLH / titleSize,
        }}
      >
        <span>{title}</span>
        {showDot ? (
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: ACCENT,
              marginLeft: 20,
              flexShrink: 0,
            }}
          />
        ) : null}
      </div>

      {/* lede — muted, ≤3 lines, hard-capped box so a surprise wrap can
          never collide with the stats block below */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: ledeTop - 25,
          width: CONTENT_W,
          height: 3 * 42,
          overflow: "hidden",
          display: "flex",
          fontSize: 25,
          fontWeight: 400,
          lineHeight: 42 / 25,
          color: Q.lede,
        }}
      >
        {lede}
      </div>

      {/* stats — hairline + three columns with vertical separators */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: statsTop,
          width: CONTENT_W,
          height: 1,
          background: Q.border,
        }}
      />
      {stats.map((s, i) => (
        <div
          key={s.label}
          style={{
            position: "absolute",
            left: MARGIN + i * (CONTENT_W / 3) + (i ? 32 : 0),
            top: statsTop,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {i ? (
            <div
              style={{
                position: "absolute",
                left: -32,
                top: 30,
                width: 1,
                height: 102,
                background: Q.border,
              }}
            />
          ) : null}
          <span
            style={{
              marginTop: 41,
              fontFamily: "JetBrains Mono",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 2,
              color: Q.muted,
            }}
          >
            {s.label}
          </span>
          <span
            style={{
              marginTop: 16,
              fontSize: 26,
              fontWeight: 600,
              color: Q.ink,
            }}
          >
            {s.value}
          </span>
          {s.desc ? (
            <span
              style={{
                marginTop: 6,
                fontSize: 15,
                fontWeight: 400,
                color: Q.muted,
              }}
            >
              {s.desc}
            </span>
          ) : null}
        </div>
      ))}

      {/* footer band — hairline, full title + host + build date left,
          QR right */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY,
          width: CONTENT_W,
          height: 1,
          background: Q.border,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY + 58,
          fontSize: 20,
          fontWeight: 600,
          color: Q.brand,
        }}
      >
        {ogText(book.title)}
      </div>
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY + 103,
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 2,
          color: Q.muted,
        }}
      >
        {SITE_HOST}
      </div>
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY + 139,
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 2,
          color: Q.muted,
        }}
      >
        {stamp}
      </div>
      <div
        style={{
          position: "absolute",
          right: MARGIN,
          top: footerY + 41,
          width: 132,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} width={132} height={132} alt="" />
        <div
          style={{
            marginTop: 12,
            width: 132,
            textAlign: "center",
            fontSize: 15,
            fontWeight: 500,
            color: Q.muted,
          }}
        >
          扫码读全书
        </div>
      </div>
    </div>,
    {
      width: W,
      height: H,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
      fonts: [
        { name: "TsangerJinKai", data: serif600, style: "normal", weight: 600 },
        { name: "TsangerJinKai", data: serif400, style: "normal", weight: 400 },
        { name: "JetBrains Mono", data: mono600, style: "normal", weight: 600 },
      ],
    },
  );
}
