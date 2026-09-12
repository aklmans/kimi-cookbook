import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getAllBooks, getBook, getChapter } from "@/lib/books";
import { coverBrandForBook } from "@/lib/cover-brand";
import { ogText } from "@/lib/og-text";
import { truncateEm } from "@/lib/poster-text";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

interface Params {
  slug: string;
  chapter: string;
}

export function generateStaticParams(): Params[] {
  return getAllBooks().flatMap((b) =>
    b.chapters.map((c) => ({ slug: b.slug, chapter: c.slug })),
  );
}

/* Same treatment as the book-level opengraph-image: LOCAL poster
   subset TTFs (npm run gen:font), upright TsangerJinKai titles.
   The small book-title eyebrow is serif too — the mono subset has
   no CJK glyphs, so a mono eyebrow would drop every Chinese char. */
const SERIF_400 = "TsangerJinKai02-W04.poster.ttf";
const SERIF_600 = "TsangerJinKai02-W05.poster.ttf";
const MONO_600 = "JetBrainsMono-SemiBold.poster.ttf";

function posterFont(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "assets/fonts", file));
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { slug, chapter: chSlug } = await params;
  const book = getBook(slug);
  const found = book ? getChapter(book, chSlug) : undefined;
  const ch = found?.chapter;
  const brand = book
    ? coverBrandForBook(book)
    : { label: slug, mark: slug.slice(0, 3).toUpperCase(), accent: "#1783FF" };
  const brandMark = ogText(brand.mark);
  const brandLabel = ogText(brand.label);
  const bookTitle = ogText(book?.title ?? slug);
  const chapterTitle = ogText(ch?.title ?? chSlug);
  const lede = truncateEm(ogText(ch?.lede ?? ""), 70);

  const [serif400, serif600, mono600] = [
    posterFont(SERIF_400),
    posterFont(SERIF_600),
    posterFont(MONO_600),
  ];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "#FAFAFA",
        padding: 80,
      }}
    >
      <div
        style={{
          width: 124,
          height: 164,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #D9D5CE",
          background: "#FFFFFF",
          color: brand.accent,
          marginRight: 52,
        }}
      >
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: brandMark.length > 3 ? 26 : 36,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {brandMark}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 10,
            fontWeight: 600,
            color: "#6B6B6B",
            marginTop: 18,
            textTransform: "uppercase",
          }}
        >
          {brandLabel}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p
          style={{
            fontFamily: "TsangerJinKai",
            fontSize: 18,
            fontWeight: 400,
            color: "#6B6B6B",
            margin: 0,
          }}
        >
          {bookTitle}
        </p>
        <h1
          style={{
            fontFamily: "TsangerJinKai",
            fontSize: 48,
            fontWeight: 600,
            color: "#1A1A1A",
            lineHeight: 1.2,
            letterSpacing: 0,
            margin: "28px 0 0 0",
            maxWidth: 850,
          }}
        >
          {chapterTitle}
        </h1>
        {lede && (
          <p
            style={{
              fontFamily: "TsangerJinKai",
              fontSize: 22,
              fontWeight: 400,
              color: "#3A3A3A",
              lineHeight: 1.5,
              margin: "32px 0 0 0",
              maxWidth: 850,
            }}
          >
            {lede}
          </p>
        )}
        <p
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0,
            color: "#1783FF",
            margin: "48px 0 0 0",
          }}
        >
          Kimi
        </p>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "TsangerJinKai", data: serif400, style: "normal", weight: 400 },
        { name: "TsangerJinKai", data: serif600, style: "normal", weight: 600 },
        { name: "JetBrains Mono", data: mono600, style: "normal", weight: 600 },
      ],
    },
  );
}
