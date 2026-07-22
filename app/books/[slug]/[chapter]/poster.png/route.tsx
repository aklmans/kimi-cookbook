import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import { getAllBooks, getBook, getChapter, chapterNumber } from "@/lib/books";
import { loadGoogleFont } from "@/lib/og-fonts";
import { ogText } from "@/lib/og-text";
import { absoluteUrl } from "@/lib/site";

/* Share poster for a chapter — THE SAME poster the Mini Program draws
   (miniapp utils/poster.js, "Zhaphar poster grammar"), re-implemented
   with next/og so the web can hand out an identical image:
   900px wide × content-driven height, 96px margins, masthead (accent
   dash + spaced mono brand + serial + hairline), mono chapter label,
   single-line title with the accent stop-dot circle, the chapter's
   <Kicker> manifesto as the protagonist quote (vertical hairline), a
   muted lede + posterSummary, and the fixed 214px footer band with a
   frame-less QR on the right. Kimi blue appears exactly twice: the
   masthead dash and the stop-dot.
   PRERENDERED AT BUILD (force-static + generateStaticParams): the
   poster only changes when the book does, so every chapter's PNG is
   baked once per deploy and served as a static file — no per-request
   Satori render or font IO (matters on the 1-core ECS). Download
   tracking (poster_download) moved to a client beacon on the
   ChapterActions download link; the response is immutable, and the
   link carries ?v=<modified> so content updates still bust caches. */

export const dynamic = "force-static";
export const dynamicParams = false;

const W = 900;
const MARGIN = 96;
const RIGHT = 804;
const FOOTER = 214;
const CONTENT_W = RIGHT - MARGIN;

const INK = "#1A1A1A";
const INK_2 = "#3A3A3A";
const INK_3 = "#6B6B6B";
const RULE = "#C0BFBA";
const ACCENT = "#1783FF";
const PAPER = "#FAFAFA";

/* Display width in em — CJK ≈ 1, latin ≈ 0.56, space ≈ 0.33. Used both
   to size the single-line title and to estimate wrapped line counts for
   the absolute layout below. */
function displayWidthEm(text: string): number {
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp > 0x2e7f) width += 1;
    else if (ch === " ") width += 0.33;
    else width += 0.56;
  }
  return width;
}

/* Rough wrapped-line guess — ONLY used to pad the canvas height H, never
   for positioning (the text stack flows in a flex column, so blocks can
   no longer overlap the way they did when every block was absolutely
   positioned off this estimate — the 01-intro lede once painted its 4th
   line under the summary). A 0.85 safety biases the guess upward; any
   remaining slack lands as air above the footer band. */
function estLines(text: string, perLineEm: number, cap: number): number {
  return Math.max(
    1,
    Math.min(cap, Math.ceil(displayWidthEm(text) / (perLineEm * 0.92))),
  );
}

/* Title fits on ONE line (size down until the estimate fits, floor 30) —
   the MP poster applies the same rule. When the accent stop-dot will be
   drawn (title not self-closed), its room is reserved up front so a
   near-full-width title never swallows the dot. */
function titleSize(title: string, reserveDot: boolean): number {
  const fitW = CONTENT_W - (reserveDot ? 40 : 0);
  return Math.max(30, Math.min(66, Math.floor(fitW / displayWidthEm(title))));
}

/* The protagonist quote is the chapter's closing <Kicker zh="…" />
   manifesto. Extracting it from the raw MDX (instead of re-running the
   whole MDX pipeline like lib/mp-render.tsx) is safe here because the
   prop is a plain JS string in every chapter. */
function extractKicker(bookSlug: string, chapterSlug: string): string {
  try {
    const raw = fs.readFileSync(
      path.join(
        process.cwd(),
        "content",
        "books",
        bookSlug,
        "chapters",
        `${chapterSlug}.mdx`,
      ),
      "utf8",
    );
    const match = raw.match(/<Kicker[\s\S]*?zh=\{"((?:[^"\\]|\\.)*)"\}/);
    return match
      ? match[1].replace(/\\n/g, " ").replace(/\s+/g, " ").trim()
      : "";
  } catch {
    return "";
  }
}

interface Params {
  slug: string;
  chapter: string;
}

export function generateStaticParams(): Params[] {
  return getAllBooks().flatMap((b) =>
    b.chapters.map((c) => ({ slug: b.slug, chapter: c.slug })),
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  void req; // prerendered at build — nothing per-request left to read
  const { slug, chapter: chSlug } = await params;
  const book = getBook(slug);
  const found = book ? getChapter(book, chSlug) : undefined;
  if (!book || !found) return new Response("not found", { status: 404 });

  const { chapter: ch, index } = found;
  const serial = chapterNumber(index);
  const bookTitle = ogText(book.title);
  const chapterTitle = ogText(ch.title);
  const lede = ogText(ch.lede);
  const summary = ogText(ch.posterSummary);
  const kicker = ogText(extractKicker(book.slug, ch.slug));

  /* Layout — mirrors the MP poster's coordinate grammar. The text stack
     (kicker → lede → summary → footer) FLOWS in a flex column, so its
     blocks can never overlap; H is the only estimate and is deliberately
     generous — slack lands above the footer band (marginTop: "auto").
     estLines is used for H padding only, never for positioning. */
  const titleClosed = /[。!?…；，、：:;,.!?…]$/.test(chapterTitle.trim());
  const size = titleSize(chapterTitle, !titleClosed);
  const titleEndY = 300 + size * 1.23;
  const kickerLines = kicker ? estLines(kicker, 674 / 30, 4) : 0;
  const ledeLines = lede ? estLines(lede, CONTENT_W / 26, 6) : 0;
  const summaryLines = summary ? estLines(summary, CONTENT_W / 24, 6) : 0;
  const flowEstimate =
    (kickerLines ? 78 + kickerLines * 46 : 0) +
    (ledeLines ? 56 + ledeLines * 40 : 0) +
    (summaryLines ? 36 + summaryLines * 40 : 0);
  const H = Math.max(
    765,
    Math.round(titleEndY + flowEstimate + 46 + FOOTER + 64),
  );

  const titleWidthPx = displayWidthEm(chapterTitle) * size;

  const qrDataUrl = await QRCode.toDataURL(
    absoluteUrl(`/books/${book.slug}/${ch.slug}`),
    {
      margin: 0,
      width: 264,
      errorCorrectionLevel: "M",
      color: { dark: INK, light: "#0000" },
    },
  );

  /* Poster serif is the LOCAL Tsanger subset TTF (npm run gen:font —
     next/og rejects WOFF2). Mono keeps the cached Google loader. */
  const serif600 = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts", "TsangerJinKai02-W05.poster.ttf"),
  );
  const serif400 = fs.readFileSync(
    path.join(process.cwd(), "assets/fonts", "TsangerJinKai02-W04.poster.ttf"),
  );
  const mono600 = await loadGoogleFont("JetBrains Mono", 600, false);

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        color: INK,
        fontFamily: "TsangerJinKai",
      }}
    >
      {/* masthead: accent dash + spaced mono brand + serial + hairline */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 132,
          width: 42,
          height: 3,
          background: ACCENT,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: MARGIN + 66,
          top: 128,
          fontFamily: "JetBrains Mono",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 4,
        }}
      >
        KIMI COOKBOOK
      </div>
      <div
        style={{
          position: "absolute",
          right: W - RIGHT,
          top: 128,
          fontFamily: "JetBrains Mono",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 4,
          color: INK_3,
        }}
      >
        {`NO. ${serial}`}
      </div>
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 180,
          width: CONTENT_W,
          height: 1,
          background: "rgba(58,58,58,0.34)",
        }}
      />

      {/* chapter label — "01 · 第一章", same as the MP poster */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 236,
          fontFamily: "JetBrains Mono",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: 3,
          color: INK_3,
        }}
      >
        {`${serial} · 第${["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][index] ?? ""}章`}
      </div>

      {/* title — one line, with the accent stop-dot circle */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: 300,
          display: "flex",
          whiteSpace: "nowrap",
          fontSize: size,
          fontWeight: 600,
          lineHeight: 1.23,
        }}
      >
        {chapterTitle}
      </div>
      {!titleClosed ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(RIGHT - 14, MARGIN + titleWidthPx + 20),
            top: 300 + size * 0.45,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: ACCENT,
          }}
        />
      ) : null}

      {/* text stack + footer — one flex column flowing from the title;
          real Satori line breaks, zero per-block estimates (see above) */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: titleEndY,
          width: CONTENT_W,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* the Kicker manifesto — vertical hairline, the protagonist */}
        {kicker ? (
          <div style={{ display: "flex", marginTop: 78 }}>
            <div
              style={{
                width: 1,
                background: RULE,
                marginRight: 33,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 30,
                fontWeight: 600,
                lineHeight: 46 / 30,
                maxWidth: CONTENT_W - 34,
              }}
            >
              {kicker}
            </div>
          </div>
        ) : null}

        {/* lede — short, muted */}
        {lede ? (
          <div
            style={{
              marginTop: 56,
              fontSize: 26,
              fontWeight: 400,
              fontFamily: "TsangerJinKai",
              lineHeight: 40 / 26,
              maxWidth: CONTENT_W,
              color: INK_2,
            }}
          >
            {lede}
          </div>
        ) : null}

        {/* poster summary — the middle-band companion (meta.posterSummary) */}
        {summary ? (
          <div
            style={{
              marginTop: 36,
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 40 / 24,
              maxWidth: CONTENT_W,
              color: INK_2,
            }}
          >
            {summary}
          </div>
        ) : null}

        {/* footer band — pinned to the canvas bottom: hairline, brand +
            site left, QR right */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: 46,
            height: FOOTER + 46,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ width: "100%", height: 1, background: RULE }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginTop: 40,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ marginTop: 37, fontSize: 20, fontWeight: 600 }}>
                {bookTitle}
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontFamily: "JetBrains Mono",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: 2,
                  color: INK_3,
                }}
              >
                kimi.read.wiki
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 132,
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
                  color: INK_3,
                }}
              >
                扫码读全文
              </div>
            </div>
          </div>
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
