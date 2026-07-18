// @ts-check
/* Headless-Chromium PDF generator.
   Renders each /books/<slug>/print route into public/books/<slug>.pdf.
   Requires a running server (default: http://localhost:3000).
   Usage:
     npm run build && npm start &
     PDF_BASE_URL=http://localhost:3000 npm run pdf */

import { chromium } from "playwright";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = (process.env.PDF_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const OUT_DIR = path.join(ROOT, "public", "books");

async function isDraftBook(bookDir) {
  const metaPath = path.join(bookDir, "meta.ts");
  let meta = "";
  try {
    meta = await fs.readFile(metaPath, "utf8");
  } catch {
    return false;
  }
  const [bookMeta] = meta.split(/\n\s*chapters\s*:/);
  return /^\s*draft\s*:\s*true\s*,?\s*$/m.test(bookMeta);
}

async function readBookLanguage(bookDir) {
  const metaPath = path.join(bookDir, "meta.ts");
  try {
    const meta = await fs.readFile(metaPath, "utf8");
    const [bookMeta] = meta.split(/\n\s*chapters\s*:/);
    return /\blanguage\s*:\s*["']zh-en["']/.test(bookMeta)
      ? "zh-en"
      : "zh";
  } catch {
    return "zh";
  }
}

async function discoverBooks() {
  const dir = path.join(ROOT, "content", "books");
  const entries = await fs.readdir(dir, { withFileTypes: true });
  // PDF_ONLY=slug[,slug] limits generation to specific books (e.g. after
  // publishing one new book, to avoid regenerating every PDF).
  const only = (process.env.PDF_ONLY ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const books = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (only.length && !only.includes(e.name)) continue;
    const bookDir = path.join(dir, e.name);
    if (await isDraftBook(bookDir)) continue;
    const chaptersDir = path.join(bookDir, "chapters");
    if (!existsSync(chaptersDir)) continue;
    const mdx = (await fs.readdir(chaptersDir)).filter((f) =>
      f.endsWith(".mdx"),
    );
    if (mdx.length > 0) {
      books.push({ slug: e.name, language: await readBookLanguage(bookDir) });
    }
  }
  return books;
}

async function pingServer() {
  try {
    const res = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`PDF generator`);
  console.log(`  source  ${BASE_URL}`);
  console.log(`  output  ${path.relative(ROOT, OUT_DIR)}/`);

  if (!(await pingServer())) {
    console.error(
      `\n✗ Server not reachable at ${BASE_URL}.\n` +
        `  Start it first:  npm run build && npm start`,
    );
    process.exit(1);
  }

  const books = await discoverBooks();
  if (books.length === 0) {
    console.error("\n✗ No books with chapter content found.");
    process.exit(1);
  }
  const jobs = books.flatMap(({ slug, language }) => [
    { slug, lang: "zh", outName: `${slug}.pdf` },
    ...(language === "zh-en"
      ? [{ slug, lang: "en", outName: `${slug}.en.pdf` }]
      : []),
  ]);
  console.log(
    `  books   ${books.length} (${books.map((b) => b.slug).join(", ")})`,
  );
  console.log(
    `  pdfs    ${jobs.length} (${jobs.map((j) => j.outName).join(", ")})\n`,
  );

  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1240, height: 1754 },
    });
    const page = await ctx.newPage();

    for (const { slug, lang, outName } of jobs) {
      const url = `${BASE_URL}/books/${slug}/print?lang=${lang}`;
      const t0 = Date.now();
      process.stdout.write(`  ${`${slug}:${lang}`.padEnd(19)} `);

      const response = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      if (!response || response.status() >= 400) {
        throw new Error(
          `${url} returned ${response?.status() ?? "no response"}`,
        );
      }
      // Fonts can reflow text — wait for them before snapshotting.
      await page.evaluate(() => document.fonts?.ready ?? null);
      await page.waitForTimeout(500);

      const outFile = path.join(OUT_DIR, outName);
      await page.pdf({
        path: outFile,
        // v3.css owns @page (A4 + 22/20/24/20mm margins + page numbers).
        preferCSSPageSize: true,
        // Keep accent colors + dividers in the PDF.
        printBackground: true,
        // v3.css renders the running header/footer via @page :left/:right;
        // we don't want Chromium adding its own on top.
        displayHeaderFooter: false,
      });

      const stat = await fs.stat(outFile);
      const kb = (stat.size / 1024).toFixed(0);
      const ms = Date.now() - t0;
      process.stdout.write(`✓  ${kb.padStart(5)} KB  ${ms.toString().padStart(5)} ms\n`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n✓ Done.`);
}

main().catch((err) => {
  console.error(`\n✗ PDF generation failed:`);
  console.error(err);
  process.exit(1);
});
