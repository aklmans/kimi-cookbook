import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LangProvider } from "@/components/LangProvider";
import { GlobalUI } from "@/components/GlobalUI";
import { SITE_URL } from "@/lib/site";

/* 仓耳今楷 (Tsanger) subset — the full font is ~8.4 MB/weight (~28k glyphs).
   scripts/gen-tsanger-subset.mjs subsets it to the ~2.2k glyphs the library
   actually renders (~0.5 MB/weight, a ~94% cut). Run `npm run gen:font` after
   adding/editing content. (CJK can't be usefully unicode-range-sliced either —
   measured ~1.5×, not worth the pipeline.)

   display:swap + preload:true — a COLD first view must still end up in
   Tsanger. `optional` only applies the font when it wins a ~100ms race
   against first paint; once it loses, that entire page view is locked to the
   fallback while the download quietly fills the HTTP cache — which is why the
   font only ever appeared after a refresh. The ~1 MB pair cannot win that
   race on an uncached network, so: `swap` upgrades the page whenever the
   download lands, and preload moves the request from "after first layout"
   to "<head> parse". The swap does not reflow: the first fallback below is
   "TsangerJinKai02 Fallback" (globals.css Round-98), the reader's system CJK
   serif force-fed Tsanger's vertical metrics — hanzi advances already match
   at 1em, so only glyph shapes and Tsanger's proportional CJK punctuation
   change on upgrade. */
const tsanger = localFont({
  src: [
    {
      path: "../assets/fonts/TsangerJinKai02-W04.subset.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/TsangerJinKai02-W05.subset.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  display: "swap",
  preload: true,
  // CJK: fall back to the system CJK serif (mirrored in the CSS --serif/--text
  // stack), not a Latin-metric-adjusted face.
  adjustFontFallback: false,
  fallback: [
    "TsangerJinKai02 Fallback",
    "Noto Serif SC",
    "Source Han Serif SC",
    "Songti SC",
    "STSong",
    "Georgia",
    "serif",
  ],
  variable: "--font-tsanger",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kimi · 从长文本到一套 agent 栈",
    template: "%s · Kimi Cookbook",
  },
  description:
    "Zhapar 写给已经付费 Kimi、却只用到一小部分的人 —— K3 旗舰与 K2.7-Code 撑起的一套 agent 栈: 四模式、Agent、Swarm、Deep Research、Kimi Code、五档会员与双兼容 API。该用哪一面、买哪档够用、什么时候回 frontier。",
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
};

/* Pre-hydration sync scripts — run at the top of <body> BEFORE any
   content is parsed / painted. Prevents FOUC for both language and theme.

   Theme note: next-themes also injects a script, but it lives inside the
   React component tree (<ThemeProvider>) so it's deeper in the HTML and
   may not fire before the browser's first paint. This script duplicates
   the logic but runs earlier, and temporarily blocks CSS transitions so
   the background-color 200ms ease doesn't animate the #FAFAFA→#1A1A1A
   flip. next-themes takes over seamlessly after hydration. */
const langInitScript = `(function(){try{var q=new URLSearchParams(location.search).get('lang');var l=(q==='zh'||q==='en')?q:localStorage.getItem('kimi:lang');if(l!=='zh'&&l!=='en')l='zh';var d=document.documentElement;d.setAttribute('data-lang',l);d.lang=l==='en'?'en':'zh-CN';}catch(e){}})();`;
const themeInitScript = `(function(){try{var c=document.createElement('style');c.appendChild(document.createTextNode('*,*::before,*::after{transition:none!important}'));document.head.appendChild(c);var d=document.documentElement,t=localStorage.getItem('kimi:theme');if(!t||t==='system')t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(t==='dark'||t==='light'){d.setAttribute('data-theme',t);d.style.colorScheme=t;}requestAnimationFrame(function(){requestAnimationFrame(function(){c.parentNode.removeChild(c)})});}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      data-lang="zh"
      suppressHydrationWarning
      className={`${tsanger.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>
        <Script id="lang-init" strategy="beforeInteractive">{langInitScript}</Script>
        <Script id="theme-init" strategy="beforeInteractive">{themeInitScript}</Script>
        <ThemeProvider>
          <LangProvider>
            {children}
            <GlobalUI />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
