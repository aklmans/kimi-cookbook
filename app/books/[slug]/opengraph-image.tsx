import { ImageResponse } from "next/og";
import { getAllBooks, getBook } from "@/lib/books";
import { coverBrandForBook } from "@/lib/cover-brand";
import { loadGoogleFont } from "@/lib/og-fonts";
import { ogText } from "@/lib/og-text";

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

export default async function Image({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const book = getBook(slug);
  const title = ogText(book?.title ?? slug);
  const titleEn = ogText(book?.titleEn ?? "");
  const brand = book
    ? coverBrandForBook(book)
    : { label: slug, mark: slug.slice(0, 3).toUpperCase(), accent: "#1783FF" };
  const brandMark = ogText(brand.mark);
  const brandLabel = ogText(brand.label);

  const [playfair, jetbrains] = await Promise.all([
    loadGoogleFont("Playfair Display", 500, true),
    loadGoogleFont("JetBrains Mono", 600, false),
  ]);

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
            fontFamily: "Playfair Display",
            fontSize: 52,
            fontStyle: "italic",
            fontWeight: 500,
            color: "#1A1A1A",
            lineHeight: 1.08,
            letterSpacing: 0,
            margin: "32px 0 0 0",
            maxWidth: 760,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontFamily: "Playfair Display",
            fontSize: 22,
            fontStyle: "italic",
            fontWeight: 500,
            color: "#3A3A3A",
            lineHeight: 1.55,
            margin: "40px 0 0 0",
            maxWidth: 780,
          }}
        >
          {titleEn}
        </p>
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
        {
          name: "Playfair Display",
          data: playfair,
          style: "italic",
          weight: 500,
        },
        {
          name: "JetBrains Mono",
          data: jetbrains,
          style: "normal",
          weight: 600,
        },
      ],
    },
  );
}
