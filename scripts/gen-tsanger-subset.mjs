// @ts-check
/* Subsets the 仓耳今楷 (TsangerJinKai02) CJK font down to only the glyphs this
   library actually renders.

   The full font is ~8.4 MB per weight (~28k glyphs). With display:swap the
   fallback shows immediately, but the swap to Tsanger only happens after the
   whole multi-MB file downloads — on a slow link that stalls for a minute. The
   whole site (every book incl. drafts + all UI) uses only ~2k glyphs, so the
   subset is ~0.5 MB per weight (a ~94% cut) — one small file, cached site-wide,
   no per-page chunk juggling.

   The content is 100% static, so the glyph set is fully known at build time: we
   scan every string that can reach the page (content MDX + UI in app/
   components/lib) and subset to exactly those code points, plus ASCII and a set
   of typographic marks the design may render.

   Run via `npm run gen:font` after adding/editing content. The generated
   *.subset.woff2 + tsanger-glyphs.txt are committed (so dev, Vercel and Aliyun
   all just work without a build-time subsetting step); quality-check warns if
   content later uses a glyph the committed subset lacks. The full
   TsangerJinKai02-W0*.woff2 stay as the subset source. */

import subsetFont from "subset-font";
import { statSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FONT_DIR = path.join(ROOT, "assets", "fonts");
const SCAN_DIRS = ["content", "app", "components", "lib"];
const TEXT_EXT = new Set([".mdx", ".md", ".ts", ".tsx", ".json"]);
const SKIP_DIR = new Set(["node_modules", ".next", ".git"]);
const WEIGHTS = [
  { src: "TsangerJinKai02-W04.woff2", out: "TsangerJinKai02-W04.subset.woff2" },
  { src: "TsangerJinKai02-W05.woff2", out: "TsangerJinKai02-W05.subset.woff2" },
];

/* Punctuation / symbols the design may render even when absent from source text
   (kept explicit so a subset never drops a quote mark or dash). */
const ALWAYS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@[\\]^_`{|}~" +
  "、。「」『』（）〔〕【】《》〈〉！？：；，．·‧…—–―‘’“”•→←↑↓°％＋－×÷＝≈～｜　";

/** Collect every code point the site can render in Tsanger. */
async function collectGlyphs() {
  const chars = new Set();
  for (const ch of ALWAYS) chars.add(ch);

  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIR.has(entry.name)) await walk(abs);
      } else if (TEXT_EXT.has(path.extname(entry.name))) {
        const text = await readFile(abs, "utf8");
        for (const ch of text) {
          const cp = ch.codePointAt(0);
          if (cp !== undefined && cp > 0x1f && cp !== 0x7f) chars.add(ch);
        }
      }
    }
  }
  for (const dir of SCAN_DIRS) await walk(path.join(ROOT, dir));
  return chars;
}

async function main() {
  const chars = await collectGlyphs();
  // Deterministic order → byte-stable subset + a diffable committed glyph list.
  const glyphList = [...chars].sort();
  const text = glyphList.join("");
  console.log(
    `font subset · ${chars.size} unique glyphs from ${SCAN_DIRS.join(", ")}`,
  );

  for (const w of WEIGHTS) {
    const srcPath = path.join(FONT_DIR, w.src);
    const buf = await readFile(srcPath);
    // subset-font intersects requested chars with the font's cmap, so requesting
    // glyphs the font lacks (emoji, rare punctuation) is harmless.
    const out = await subsetFont(buf, text, { targetFormat: "woff2" });
    await writeFile(path.join(FONT_DIR, w.out), out);
    const before = statSync(srcPath).size;
    const pct = (100 - (out.length / before) * 100).toFixed(1);
    console.log(
      `  ${w.out.padEnd(34)} ${(before / 1048576).toFixed(1)}MB → ` +
        `${(out.length / 1024).toFixed(0).padStart(4)}KB  (−${pct}%)`,
    );
  }

  // Sidecar the exact glyph set so quality-check can flag a stale subset.
  await writeFile(path.join(FONT_DIR, "tsanger-glyphs.txt"), text, "utf8");
  console.log(`✓ done · wrote tsanger-glyphs.txt (${chars.size} glyphs)`);
}

main().catch((err) => {
  console.error("✗ font subset failed:");
  console.error(err);
  process.exit(1);
});
