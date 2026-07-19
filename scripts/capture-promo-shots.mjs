#!/usr/bin/env node
/* Capture live-site screenshots for promo posters into output/promo/assets/.
 * Light theme, desktop + mobile frames. */
import { chromium } from "playwright";
import fs from "node:fs";

fs.mkdirSync("output/promo/assets", { recursive: true });

const browser = await chromium.launch();

const shots = [
  {
    url: "https://kimi.read.wiki/",
    out: "output/promo/assets/site-home-desktop.png",
    viewport: { width: 1280, height: 800 },
  },
  {
    url: "https://kimi.read.wiki/books/kimi/01-intro",
    out: "output/promo/assets/site-chapter-mobile.png",
    viewport: { width: 390, height: 844 },
  },
];

for (const shot of shots) {
  const page = await browser.newPage({
    viewport: shot.viewport,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  await page.goto(shot.url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: shot.out });
  await page.close();
  console.log(`captured ${shot.out}`);
}

await browser.close();
