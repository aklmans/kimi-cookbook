import { ImageResponse } from "next/og";
import { loadGoogleFont } from "@/lib/og-fonts";

export const alt = "Kimi · 从长文本到一套 agent 栈";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "#FAFAFA",
        padding: 80,
      }}
    >
      <p
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#6B6B6B",
          margin: 0,
        }}
      >
        Kimi · read.wiki
      </p>
      <h1
        style={{
          fontFamily: "Playfair Display",
          fontSize: 64,
          fontStyle: "italic",
          fontWeight: 500,
          color: "#1A1A1A",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          margin: "32px 0 0 0",
          maxWidth: 900,
        }}
      >
        Kimi · 从长文本到一套 agent 栈
      </h1>
      <p
        style={{
          fontFamily: "Playfair Display",
          fontSize: 24,
          fontStyle: "italic",
          fontWeight: 500,
          color: "#3A3A3A",
          lineHeight: 1.55,
          margin: "40px 0 0 0",
        }}
      >
        Zhaphar 著 · 十章 · 在线阅读 · PDF · llms.md
      </p>
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
