#!/usr/bin/env node
/* Build the 小红书 promo video from the livestream replays.
 *
 * Pipeline (all artifacts land in output/video/, gitignored):
 *   1. caption-band PNGs (paper bands top/bottom, transparent middle) +
 *      hook / CTA cards — rendered with scripts/render-promo.mjs;
 *   2. playwright scroll capture of the live site (results segment);
 *   3. per-segment ffmpeg: trim → speed → scale 1080x608 → pad into the
 *      1080x1440 canvas → overlay that segment's caption band;
 *   4. concat everything into output/video/kimi-cookbook-promo.mp4.
 *
 * Segments/captions are data below — tweak and re-run. No original audio
 * (sped-up livestream sound is noise); add BGM in 小红书/剪映 if wanted.
 *
 * Requires: ffmpeg, playwright (repo devDeps).
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = "output/video";
const SRC = {
  A: "output/直播回放_2026-07-19_12-43-04.mp4",
  B: "output/直播回放_2026-07-19_14-43-08.mp4",
};

/* [src, startSec, windowSec, speed, caption] */
const SEGMENTS = [
  ["A", 295, 20, 6, "小程序,从空项目开始"],
  ["A", 1495, 20, 5, "月亮封面,在模拟器里亮了"],
  ["A", 2995, 20, 6, "界面,一版一版调"],
  ["A", 3895, 20, 6, "页面一个个长出来"],
  ["A", 5395, 20, 6, "代码推到仓库"],
  ["A", 5695, 20, 8, "报错是日常"],
  ["A", 6595, 20, 6, "写书的,也是 Kimi"],
  ["B", 595, 20, 6, "书稿逐章打磨"],
  ["B", 1795, 20, 6, "下半场,继续"],
  ["B", 2695, 20, 6, "边查资料边写"],
  ["B", 3295, 20, 8, "再报错,再修"],
  ["B", 5995, 20, 5, "网站能读了"],
  ["B", 6895, 20, 5, "收尾,上线"],
];

const CANVAS = { w: 1080, h: 1440, holeY: 416, holeH: 608 };
const FONT_DIR = path.resolve("assets/fonts");

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit" });
const runShell = (cmd) => execSync(cmd, { stdio: "inherit" });

/* ── 1. band / card HTML ─────────────────────────────── */

const baseCss = `
  @font-face { font-family:"TJK"; src:url("${pathToFileURL(
    path.join(FONT_DIR, "TsangerJinKai02-W04.woff2"),
  )}") format("woff2"); font-weight:400; }
  @font-face { font-family:"TJK"; src:url("${pathToFileURL(
    path.join(FONT_DIR, "TsangerJinKai02-W05.woff2"),
  )}") format("woff2"); font-weight:500; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1080px; height:1440px; position:relative; overflow:hidden;
         font-family:"TJK",serif; background:transparent; }
`;

function pathToFileURL(p) {
  return "file://" + p.split(path.sep).map(encodeURIComponent).join("/");
}

function bandHtml({ caption, index, total }) {
  /* 纸带只画上/下,中间留透明窗(y=416..1024)给视频 */
  const progress = 72 + ((936 - 72) * index) / total;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
  .band { position:absolute; left:0; right:0; background:#FAFAFA; }
  .top { top:0; height:${CANVAS.holeY}px; }
  .bottom { top:${CANVAS.holeY + CANVAS.holeH}px; bottom:0; }
  .kicker { position:absolute; left:72px; top:236px; font-size:26px;
            letter-spacing:.3em; color:#6B6B6B; }
  .cap { position:absolute; left:72px; right:72px; top:288px;
         font-size:52px; font-weight:500; color:#1A1A1A; }
  .cap em { color:#1783FF; font-style:normal; }
  .brand { position:absolute; left:72px; bottom:300px; font-size:24px;
           letter-spacing:.26em; color:#6B6B6B; }
  .no { position:absolute; right:72px; bottom:300px; font-size:24px;
        letter-spacing:.18em; color:#6B6B6B; }
  .track { position:absolute; left:72px; right:72px; bottom:348px;
           height:2px; background:#C0BFBA; }
  .bar { position:absolute; left:72px; bottom:348px; height:2px;
         width:${progress - 72}px; background:#1783FF; }
  </style></head><body>
    <div class="band top">
      <div class="kicker">KIMI COOKBOOK · 直播开发实录</div>
      <div class="cap">${caption}</div>
    </div>
    <div class="band bottom">
      <div class="track"></div><div class="bar"></div>
      <div class="brand">KIMI COOKBOOK</div>
      <div class="no">${String(index).padStart(2, "0")} / ${total}</div>
    </div>
  </body></html>`;
}

function cardHtml({ kicker, title, sub, qr }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}
  body { background:#FAFAFA; }
  .disc { position:absolute; top:-110px; right:-150px; width:620px; height:620px;
          border-radius:50%; background:#0E0E13; }
  .mast { position:absolute; top:72px; left:72px; display:flex; align-items:center; gap:20px; }
  .mast img.tile { width:56px; height:56px; border-radius:12px; }
  .mast .name { font-size:30px; letter-spacing:.24em; font-weight:500; color:#1A1A1A; }
  .wrap { position:absolute; left:72px; right:72px; top:430px; }
  .kicker { font-size:30px; letter-spacing:.3em; color:#6B6B6B; margin-bottom:44px; }
  h1 { font-size:${title.length > 14 ? 84 : 104}px; line-height:1.35; font-weight:500; color:#1A1A1A; }
  h1 em { color:#1783FF; font-style:normal; }
  .sub { margin-top:52px; font-size:36px; line-height:1.7; color:#3A3A3A; }
  .qr { position:absolute; left:50%; transform:translateX(-50%); top:980px;
        width:300px; background:#fff; border:1px solid #C0BFBA; padding:20px 20px 16px; }
  .qr img { display:block; width:100%; }
  .qr .cap { margin-top:12px; font-size:22px; text-align:center; color:#1A1A1A; }
  .sign { position:absolute; left:72px; right:72px; bottom:72px; border-top:1px solid #C0BFBA;
          padding-top:28px; display:flex; justify-content:space-between;
          font-size:24px; letter-spacing:.24em; color:#6B6B6B; }
  </style></head><body>
    <div class="disc"><svg viewBox="0 0 620 620" xmlns="http://www.w3.org/2000/svg">
      <mask id="b"><rect x="100" y="200" width="400" height="400" fill="#fff"/>
      <circle cx="288" cy="386" r="143" fill="#000"/></mask>
      <circle cx="310" cy="400" r="150" fill="#1B1B25"/>
      <circle cx="310" cy="400" r="150" fill="#EFE8DC" mask="url(#b)"/>
      <circle cx="415" cy="290" r="49" fill="#1783FF" opacity="0.18"/>
      <circle cx="415" cy="290" r="29" fill="#1783FF"/></svg></div>
    <div class="mast">
      <img class="tile" src="${pathToFileURL(path.resolve("assets/brand/mp-avatar.svg"))}">
      <div class="name">KIMI COOKBOOK</div>
    </div>
    <div class="wrap">
      <div class="kicker">${kicker}</div>
      <h1>${title}</h1>
      <div class="sub">${sub}</div>
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

/* ── 2. 生成并渲染卡片 ───────────────────────────────── */

fs.mkdirSync(`${OUT}/cards`, { recursive: true });
fs.mkdirSync(`${OUT}/segs`, { recursive: true });

const render = (html, png) => {
  const htmlPath = png.replace(/\.png$/, ".html");
  fs.writeFileSync(htmlPath, html);
  run("node", ["scripts/render-promo.mjs", htmlPath, png, "1080", "1440", "1"]);
};

const total = SEGMENTS.length;
SEGMENTS.forEach(([, , , , cap], i) => {
  render(bandHtml({ caption: cap, index: i + 1, total }), `${OUT}/cards/band-${String(i + 1).padStart(2, "0")}.png`);
});

render(
  cardHtml({
    kicker: "直播开发 · 全程实录",
    title: "4 小时直播,<br>我用 <em>Kimi</em> 做出<br>了一书三端。",
    sub: "一本书 · 一个网站 · 一个小程序",
  }),
  `${OUT}/cards/hook.png`,
);
render(
  cardHtml({
    kicker: "开始读",
    title: "扫一下,<br>现在就读。",
    sub: "网页版 kimi.read.wiki · 代码开源",
    qr: true,
  }),
  `${OUT}/cards/cta.png`,
);
render(
  bandHtml({ caption: "成果 · <em>kimi.read.wiki</em> 一镜到底", index: total, total }),
  `${OUT}/cards/band-scroll.png`,
);

/* ── 3. 网站滚动实录(成果段)────────────────────────── */

if (!fs.existsSync(`${OUT}/scroll.webm`)) {
  const scrollScript = `
    import { chromium } from "playwright";
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
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
  fs.writeFileSync(`${OUT}/_scroll.mjs`, scrollScript);
  run("node", [`${OUT}/_scroll.mjs`]);
}

/* ── 4. 分段转码(裁窗 → 加速 → 上画布 → 压字幕带)────── */

const { w, h, holeY, holeH } = CANVAS;
const enc = (args) => run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args]);

SEGMENTS.forEach(([src, start, dur, speed], i) => {
  const n = String(i + 1).padStart(2, "0");
  enc([
    "-ss", String(start), "-t", String(dur), "-i", SRC[src],
    "-i", `${OUT}/cards/band-${n}.png`,
    "-filter_complex",
    `[0:v]setpts=PTS/${speed},format=rgba,scale=${w}:${holeH},` +
      `pad=${w}:${h}:0:${holeY}:color=black@0[vid];` +
      `[vid][1:v]overlay=0:0,format=yuv420p[out]`,
    "-map", "[out]", "-r", "30", "-c:v", "libx264", "-crf", "20",
    "-preset", "medium", "-an", `${OUT}/segs/seg-${n}.mp4`,
  ]);
});

const card = (png, secs, out) =>
  enc([
    "-loop", "1", "-t", String(secs), "-i", png,
    "-vf", "format=yuv420p", "-r", "30", "-c:v", "libx264", "-crf", "20",
    "-preset", "medium", "-an", out,
  ]);

card(`${OUT}/cards/hook.png`, 3.2, `${OUT}/segs/seg-00.mp4`);

enc([
  "-i", `${OUT}/scroll.webm`,
  "-i", `${OUT}/cards/band-scroll.png`,
  "-filter_complex",
  `[0:v]setpts=PTS/1,format=rgba,scale=${w}:${holeH},` +
    `pad=${w}:${h}:0:${holeY}:color=black@0[vid];` +
    `[vid][1:v]overlay=0:0,format=yuv420p[out]`,
  "-map", "[out]", "-r", "30", "-c:v", "libx264", "-crf", "20",
  "-preset", "medium", "-an", `${OUT}/segs/seg-14.mp4`,
]);

card(`${OUT}/cards/cta.png`, 4.5, `${OUT}/segs/seg-15.mp4`);

/* ── 5. 拼接 ────────────────────────────────────────── */

const list = Array.from({ length: 16 }, (_, i) => `seg-${String(i).padStart(2, "0")}.mp4`);
fs.writeFileSync(
  `${OUT}/segs/list.txt`,
  list.map((f) => `file '${path.resolve(OUT, "segs", f)}'`).join("\n"),
);
runShell(
  `ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i ${OUT}/segs/list.txt -c copy ${OUT}/kimi-cookbook-promo.mp4`,
);

console.log("\ndone → output/video/kimi-cookbook-promo.mp4");
