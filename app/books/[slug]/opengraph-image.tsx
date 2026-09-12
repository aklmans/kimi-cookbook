import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import { getAllBooks, getBook } from "@/lib/books";
import { coverBrandForBook } from "@/lib/cover-brand";
import { ogText } from "@/lib/og-text";
import { truncateEm } from "@/lib/poster-text";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface Params {
  slug: string;
}

export const alt = "Book cover";
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}

/* Fonts are the same LOCAL poster subset TTFs the share posters use
   (npm run gen:font) — prerendering needs no network, and the serif
   titles are upright TsangerJinKai (CJK never gets a synthetic
   italic). Registration pattern: lib/book-poster.tsx. */
const SERIF_400 = "TsangerJinKai02-W04.poster.ttf";
const SERIF_600 = "TsangerJinKai02-W05.poster.ttf";
const MONO_600 = "JetBrainsMono-SemiBold.poster.ttf";

function posterFont(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "assets/fonts", file));
}

export default async function Image({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const book = getBook(slug);
  const title = ogText(book?.title ?? slug);
  const brand = book
    ? coverBrandForBook(book)
    : { label: slug, mark: slug.slice(0, 3).toUpperCase(), accent: "#1783FF" };
  const brandMark = ogText(brand.mark);
  const brandLabel = ogText(brand.label);
  const lede = truncateEm(ogText(book?.lede ?? ""), 60);

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
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFAFA",
        padding: 80,
      }}
    >
      <div
        style={{
          width: 168,
          height: 224,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #D9D5CE",
          background: "#FFFFFF",
          color: brand.accent,
          marginRight: 58,
        }}
      >
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: brandMark.length > 3 ? 34 : 46,
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {brandMark}
        </div>
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 13,
            fontWeight: 600,
            color: "#6B6B6B",
            marginTop: 22,
            textTransform: "uppercase",
          }}
        >
          {brandLabel}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <p
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0,
            textTransform: "uppercase",
            color: "#6B6B6B",
            margin: 0,
          }}
        >
          {ogText(book ? book.tags.join(" · ") : "")}
        </p>
        <h1
          style={{
            fontFamily: "TsangerJinKai",
            fontSize: 52,
            fontWeight: 600,
            color: "#1A1A1A",
            lineHeight: 1.2,
            letterSpacing: 0,
            margin: "32px 0 0 0",
            maxWidth: 760,
          }}
        >
          {title}
        </h1>
        {lede && (
          <p
            style={{
              fontFamily: "TsangerJinKai",
              fontSize: 22,
              fontWeight: 400,
              color: "#3A3A3A",
              lineHeight: 1.5,
              margin: "36px 0 0 0",
              maxWidth: 780,
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
