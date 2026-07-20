#!/usr/bin/env node
/* Build the Bilibili promo video (1920x1080, ~2 min) from the livestream
 * replays. Sibling of scripts/build-promo-video.mjs (小红书竖版) — same
 * architecture, B站 geometry:
 *   1. bottom caption bands (paper, Tsanger 仓耳今楷 captions, transparent
 *      elsewhere) + hook / CTA cards at 1920x1080 via scripts/render-promo.mjs;
 *   2. per-segment ffmpeg: trim → speed → overlay band (source is already
 *      1920x1080, no letterboxing);
 *   3. concat into output/video/kimi-cookbook-bili.mp4.
 * Silent by design — add BGM in the B站 editor (石进 / lo-fi, 40–60%).
 * Segments/captions are data below — tweak and re-run.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "output/video";
const SRC = {
  A: "output/直播回放_2026-07-19_12-43-04.mp4",
  B: "output/直播回放_2026-07-19_14-43-08.mp4",
};

/* [src, startSec, windowSec, speed, caption] — 15 segments ≈ 90s montage.
   (The 1495s window was dropped: it caught the Kimi quota dashboard —
   personal account data, off-topic.) */
const SEGMENTS = [
  ["A", 295, 36, 5, "小程序,从空项目开始"],
  ["A", 2995, 36, 5, "界面,一版一版调"],
  ["A", 3895, 36, 5, "页面一个个长出来"],
  ["A", 5395, 36, 5, "代码推到仓库"],
  ["A", 5695, 36, 5, "报错是日常"],
  ["A", 6595, 36, 5, "写书的,也是 Kimi"],
  ["B", 595, 36, 5, "书稿逐章打磨"],
  ["B", 1795, 36, 5, "下半场,继续"],
  ["B", 2695, 36, 5, "边查资料边写"],
  ["B", 3295, 36, 5, "再报错,再修"],
  ["B", 4200, 36, 5, "和 Kimi 对稿改稿"],
  ["B", 5995, 36, 5, "网站能读了"],
  ["B", 6300, 36, 5, "部署,也是开发的一部分"],
  ["B", 6600, 36, 5, "收尾:发布与整理"],
  ["B", 6895, 36, 5, "一书三端,上线"],
];

const CANVAS = { w: 1920, h: 1080, bandH: 96 };
const FONT_DIR = path.resolve("assets/fonts");

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });

function pathToFileURL(p) {
  return "file://" + p.split(path.sep).map(encodeURIComponent).join("/");
}

const baseCss = `
  @font-face { font-family:"TJK"; src:url("${pathToFileURL(
    path.join(FONT_DIR, "TsangerJinKai02-W04.woff2"),
  )}") format("woff2"); font-weight:400; }
  @font-face { font-family:"TJK"; src:url("${pathToFileURL(
    path.join(FONT_DIR, "TsangerJinKai02-W05.woff2"),
  )}") format("woff2"); font-weight:500; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1920px; height:1080px; position:relative; overflow:hidden;
         font-family:"TJK",serif; background:transparent; }
`;

/* Bottom caption band: hairline top, paper, brand left · Tsanger caption
   center · segment number right. This IS the 仓耳今楷 subtitle — burned in. */
function bandHtml({ caption, index, total }) {
  const num = index && total ? `${String(index).padStart(2, "0")} / ${total}` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
  .band { position:absolute; left:0; right:0; bottom:0; height:${CANVAS.bandH}px;
          background:#FAFAFA; border-top:1px solid #C0BFBA;
          display:flex; align-items:center; }
  .brand { margin-left:64px; font-size:20px; letter-spacing:.22em;
           color:#6B6B6B; white-space:nowrap; }
  .cap { position:absolute; left:50%; transform:translateX(-50%);
         font-size:40px; font-weight:500; color:#1A1A1A; white-space:nowrap; }
  .cap em { color:#1783FF; font-style:normal; }
  .num { margin-left:auto; margin-right:64px; font-size:20px;
         letter-spacing:.18em; color:#6B6B6B; white-space:nowrap; }
  </style></head><body>
    <div class="band">
      <div class="brand">KIMI COOKBOOK · 直播实录</div>
      <div class="cap">${caption}</div>
      <div class="num">${num}</div>
    </div>
  </body></html>`;
}

function cardHtml({ kicker, title, sub, qr, slogan }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
  body { background:#FAFAFA; }
  .disc { position:absolute; top:-140px; right:-180px; width:640px; height:640px;
          border-radius:50%; background:#0E0E13; }
  .mast { position:absolute; top:72px; left:96px; display:flex; align-items:center; gap:20px; }
  .mast img.tile { width:56px; height:56px; border-radius:12px; }
  .mast .name { font-size:30px; letter-spacing:.24em; font-weight:500; color:#1A1A1A; }
  .wrap { position:absolute; left:96px; top:300px; width:1180px; }
  .kicker { font-size:28px; letter-spacing:.3em; color:#6B6B6B; margin-bottom:40px; }
  h1 { font-size:96px; line-height:1.35; font-weight:500; color:#1A1A1A; }
  h1 em { color:#1783FF; font-style:normal; }
  .sub { margin-top:44px; font-size:34px; line-height:1.7; color:#3A3A3A; }
  .slogan { margin-top:40px; font-size:24px; letter-spacing:.18em; color:#6B6B6B; }
  .slogan em { color:#1783FF; font-style:normal; font-weight:500; }
  .qr { position:absolute; right:160px; top:300px; width:340px; background:#fff;
        border:1px solid #C0BFBA; padding:24px 24px 18px; }
  .qr img { display:block; width:100%; }
  .qr .cap { margin-top:14px; font-size:22px; text-align:center; color:#1A1A1A; }
  .sign { position:absolute; left:96px; right:96px; bottom:64px;
          border-top:1px solid #C0BFBA; padding-top:24px; display:flex;
          justify-content:space-between; font-size:22px; letter-spacing:.24em;
          color:#6B6B6B; }
  </style></head><body>
    <div class="disc"><svg viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
      <mask id="b"><rect x="110" y="210" width="400" height="400" fill="#fff"/>
      <circle cx="288" cy="386" r="143" fill="#000"/></mask>
      <circle cx="310" cy="400" r="150" fill="#1B1B25"/>
      <circle cx="310" cy="400" r="150" fill="#EFE8DC" mask="url(#b)"/>
      <circle cx="430" cy="290" r="49" fill="#1783FF" opacity="0.18"/>
      <circle cx="430" cy="290" r="29" fill="#1783FF"/></svg></div>
    <div class="mast">
      <img class="tile" src="${pathToFileURL(path.resolve("assets/brand/mp-avatar.svg"))}">
      <div class="name">KIMI COOKBOOK</div>
    </div>
    <div class="wrap">
      <div class="kicker">${kicker}</div>
      <h1>${title}</h1>
      <div class="sub">${sub}</div>
      ${slogan ? `<div class="slogan">Think clearly. Build with <em>Kimi</em>.</div>` : ""}
    </div>
    ${
      qr
        ? `<div class="qr"><img src="${pathToFileURL(
            path.resolve("public/miniapp-qrcode.jpg"),
          )}"><div class="cap">微信扫码 · 小程序直达</div></div>`
        : ""
    }
    <div class="sign"><span>KIMI COOKBOOK</span><span>2026</span></div>
  </body></html>`;
}

/* ── generate + render cards ── */
fs.mkdirSync(`${OUT}/bili/cards`, { recursive: true });
fs.mkdirSync(`${OUT}/bili/segs`, { recursive: true });

const render = (html, png) => {
  const htmlPath = png.replace(/\.png$/, ".html");
  fs.writeFileSync(htmlPath, html);
  run("node", ["scripts/render-promo.mjs", htmlPath, png, "1920", "1080", "1"]);
};

const total = SEGMENTS.length;
SEGMENTS.forEach(([, , , , cap], i) => {
  render(bandHtml({ caption: cap, index: i + 1, total }), `${OUT}/bili/cards/band-${String(i + 1).padStart(2, "0")}.png`);
});
render(bandHtml({ caption: "成果 · <em>kimi.read.wiki</em> 一镜到底", index: 0, total: 0 }), `${OUT}/bili/cards/band-scroll.png`);
render(
  cardHtml({
    kicker: "直播开发 · 全程实录",
    title: "4 小时直播,<br>我用 <em>Kimi</em> 做出<br>了一书三端。",
    sub: "一本书 · 一个网站 · 一个小程序",
    slogan: true,
  }),
  `${OUT}/bili/cards/hook.png`,
);
render(
  cardHtml({
    kicker: "开始读",
    title: "扫一下,<br>现在就读。",
    sub: "网页版 kimi.read.wiki · 代码开源",
    qr: true,
  }),
  `${OUT}/bili/cards/cta.png`,
);

/* ── scroll capture (reuse the 1920x1080 one if present) ── */
if (!fs.existsSync(`${OUT}/scroll.webm`)) {
  const scrollScript = `
    import { chromium } from "playwright";
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      colorScheme: "light",
      recordVideo: { dir: "${OUT}", size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();
    await page.goto("https://kimi.read.wiki/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((resolve) => {
      let y = 0;
      const timer = setInterval(() => {
        y += 5;
        window.scrollTo(0, y);
        if (y + innerHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          setTimeout(resolve, 1200);
        }
      }, 16);
    }));
    const video = page.video();
    await ctx.close();
    await video.saveAs("${OUT}/scroll.webm");
    await browser.close();
  `;
  fs.writeFileSync(`${OUT}/bili/_scroll.mjs`, scrollScript);
  run("node", [`${OUT}/bili/_scroll.mjs`]);
}

/* ── encode segments ── */
const enc = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

SEGMENTS.forEach(([src, start, dur, speed], i) => {
  const n = String(i + 1).padStart(2, "0");
  enc([
    "-ss", String(start), "-t", String(dur), "-i", SRC[src],
    "-i", `${OUT}/bili/cards/band-${n}.png`,
    "-filter_complex",
    `[0:v]setpts=PTS/${speed},format=rgba[vid];` +
      `[vid][1:v]overlay=0:0,format=yuv420p[out]`,
    "-map", "[out]", "-r", "30", "-c:v", "libx264", "-crf", "20",
    "-preset", "medium", "-an", `${OUT}/bili/segs/seg-${n}.mp4`,
  ]);
});

const card = (png, secs, out) =>
  enc([
    "-loop", "1", "-t", String(secs), "-i", png,
    "-vf", "format=yuv420p", "-r", "30", "-c:v", "libx264", "-crf", "20",
    "-preset", "medium", "-an", out,
  ]);

card(`${OUT}/bili/cards/hook.png`, 3, `${OUT}/bili/segs/seg-00.mp4`);

enc([
  "-i", `${OUT}/scroll.webm`,
  "-i", `${OUT}/bili/cards/band-scroll.png`,
  "-filter_complex",
  `[0:v]setpts=PTS/1,format=rgba[vid];[vid][1:v]overlay=0:0,format=yuv420p[out]`,
  "-map", "[out]", "-r", "30", "-c:v", "libx264", "-crf", "20",
  "-preset", "medium", "-an", `${OUT}/bili/segs/seg-17.mp4`,
]);

card(`${OUT}/bili/cards/cta.png`, 5, `${OUT}/bili/segs/seg-18.mp4`);

/* ── concat ── */
const list = Array.from({ length: 19 }, (_, i) => `seg-${String(i).padStart(2, "0")}.mp4`);
fs.writeFileSync(
  `${OUT}/bili/segs/list.txt`,
  list.map((f) => `file '${path.resolve(OUT, "bili", "segs", f)}'`).join("\n"),
);
execSync(
  `ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i ${OUT}/bili/segs/list.txt -c copy ${OUT}/kimi-cookbook-bili.mp4`,
  { stdio: "inherit" },
);

console.log("\ndone → output/video/kimi-cookbook-bili.mp4");
