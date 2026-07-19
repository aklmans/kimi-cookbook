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
   masthead dash and the stop-dot. Prerendered at build like the OG
   images; the chapter bar downloads it straight away. */

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

function estLines(text: string, perLineEm: number, cap: number): number {
  return Math.max(1, Math.min(cap, Math.ceil(displayWidthEm(text) / perLineEm)));
}

/* Title fits on ONE line (size down until the estimate fits the content
   width, floor 30) — the MP poster applies the same rule. */
function titleSize(title: string): number {
  return Math.max(30, Math.min(66, Math.floor(CONTENT_W / displayWidthEm(title))));
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
  _req: Request,
  { params }: { params: Promise<Params> },
) {
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

  /* Layout — mirrors the MP poster's coordinate grammar. */
  const size = titleSize(chapterTitle);
  const titleEndY = 300 + size * 1.23;
  const kickerLines = kicker ? estLines(kicker, 674 / 30, 2) : 0;
  const kickerTop = titleEndY + 78;
  const kickerEndY = kickerLines ? kickerTop + (kickerLines - 1) * 46 : titleEndY;
  const ledeLines = lede ? estLines(lede, CONTENT_W / 26, 3) : 0;
  const ledeTop = (kickerLines ? kickerEndY : titleEndY) + 56;
  const ledeEndY = ledeLines ? ledeTop + (ledeLines - 1) * 40 : kickerEndY;
  const summaryLines = summary ? estLines(summary, CONTENT_W / 24, 3) : 0;
  const summaryTop = (ledeLines ? ledeEndY : kickerEndY) + (summaryLines ? 36 : 0);
  const summaryEndY = summaryLines ? summaryTop + (summaryLines - 1) * 40 : ledeEndY;
  const contentBottom =
    (summaryLines ? summaryEndY : ledeLines ? ledeEndY : kickerEndY) + 8;
  const footerY = contentBottom + 46;
  const H = Math.max(765, Math.round(footerY + FOOTER));

  const titleWidthPx = displayWidthEm(chapterTitle) * size;
  const titleClosed = /[。!?…；，、：:;,.!?…]$/.test(chapterTitle.trim());

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
            left: Math.min(RIGHT - 16, MARGIN + titleWidthPx + 20),
            top: 300 + size * 0.45,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: ACCENT,
          }}
        />
      ) : null}

      {/* the Kicker manifesto — vertical hairline, the protagonist */}
      {kicker ? (
        <div
          style={{
            position: "absolute",
            left: MARGIN,
            top: kickerTop - 24,
            display: "flex",
          }}
        >
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
            position: "absolute",
            left: MARGIN,
            top: ledeTop,
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
            position: "absolute",
            left: MARGIN,
            top: summaryTop,
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

      {/* footer band — hairline, brand + site left, QR right */}
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY,
          width: CONTENT_W,
          height: 1,
          background: RULE,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY + 78,
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {bookTitle}
      </div>
      <div
        style={{
          position: "absolute",
          left: MARGIN,
          top: footerY + 116,
          fontFamily: "JetBrains Mono",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 2,
          color: INK_3,
        }}
      >
        kimi.read.wiki
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        width={132}
        height={132}
        alt=""
        style={{ position: "absolute", right: W - RIGHT, top: footerY + 41 }}
      />
      <div
        style={{
          position: "absolute",
          right: W - RIGHT,
          top: footerY + 185,
          width: 132,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 500,
          color: INK_3,
        }}
      >
        扫码读全文
      </div>
    </div>,
    {
      width: W,
      height: H,
      fonts: [
        { name: "TsangerJinKai", data: serif600, style: "normal", weight: 600 },
        { name: "TsangerJinKai", data: serif400, style: "normal", weight: 400 },
        { name: "JetBrains Mono", data: mono600, style: "normal", weight: 600 },
      ],
    },
  );
}
