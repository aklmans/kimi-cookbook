#!/usr/bin/env node
/* Render promo posters (promo/*.html) to PNG with Playwright.
 *
 * Usage:
 *   node scripts/render-promo.mjs promo/01-cover.html output/promo/01-cover.png
 *   node scripts/render-promo.mjs promo/01-cover.html output/promo/01.png 1080 1440 2
 *
 * Defaults: 1080x1440 (小红书 3:4) at deviceScaleFactor 2. Fonts load from
 * ../assets/fonts relative to the HTML file, so we wait on document.fonts.
 */
import { chromium } from "playwright";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [input, output, width = "1080", height = "1440", scale = "2"] =
  process.argv.slice(2);

if (!input || !output) {
  console.error(
    "usage: node scripts/render-promo.mjs <input.html> <output.png> [width] [height] [scale]",
  );
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: Number(scale),
});

await page.goto(pathToFileURL(path.resolve(input)).href);
await page.evaluate(() => document.fonts.ready);
/* omitBackground keeps CSS-transparent regions transparent in the PNG —
   the video caption bands rely on a see-through middle hole. Posters with
   an opaque body background are unaffected. */
await page.screenshot({ path: output, omitBackground: true });
await browser.close();

console.log(`rendered ${output}`);
