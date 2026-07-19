import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const failures = [];
const warnings = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function assertIncludes(rel, needle, message) {
  if (!read(rel).includes(needle)) fail(message);
}

function assertFileIncludes(rel, needle, message) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    fail(message);
    return;
  }
  if (!fs.readFileSync(abs, "utf8").includes(needle)) fail(message);
}

function assertNotIncludes(rel, needle, message) {
  if (read(rel).includes(needle)) fail(message);
}

function assertMissing(rel, message) {
  if (fs.existsSync(path.join(root, rel))) fail(message);
}

async function importTsModule(rel) {
  const source = read(rel);
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: rel,
  }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  return import(dataUrl);
}

function assertDeepEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function walk(dir) {
  const abs = path.join(root, dir);
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(rel) : [rel];
  });
}

assertNotIncludes(
  "app/feed.xml/route.ts",
  "aklman.example",
  "RSS route must not use the placeholder aklman.example domain.",
);
assertIncludes(
  "lib/site.ts",
  "kimi.read.wiki",
  "Canonical site helper should default to kimi.read.wiki.",
);
assertIncludes(
  ".gitignore",
  ".AppleDouble",
  "Git ignore rules should cover macOS AppleDouble metadata directories.",
);
assertIncludes(
  ".gitignore",
  "._*",
  "Git ignore rules should cover macOS resource-fork sidecar files.",
);

assertNotIncludes(
  "components/SiteFooter.tsx",
  'href="#"',
  "Footer links must not point to #.",
);
assertIncludes(
  "components/SiteFooter.tsx",
  "https://x.com/ak_zhaphar",
  "Footer should link to the author's real X/Twitter profile.",
);
assertIncludes(
  "components/SiteFooter.tsx",
  "https://github.com/aklmans/kimi-cookbook",
  "Footer should link to the site's real GitHub repository.",
);

assertNotIncludes(
  "app/about/page.tsx",
  "放入项目即可自动覆盖",
  "About page should not tell readers to install the QR image.",
);
assertNotIncludes(
  "app/about/page.tsx",
  "<span>QR · 160 × 160</span>",
  "WeChat QR placeholder label must not be hard-coded over a real QR image.",
);
assertNotIncludes(
  "app/about/page.tsx",
  'const portraitSrc = "/avatar.jpg";',
  "About page should be library-first, not portrait-led.",
);
assertNotIncludes(
  "app/about/page.tsx",
  'placeholder="Portrait · 256 × 256"',
  "About page should not show a portrait-size placeholder when a real avatar exists.",
);
assertIncludes(
  "app/about/page.tsx",
  "About the Book",
  "About page should introduce the book, not only the author.",
);
assertIncludes(
  "app/about/page.tsx",
  'href="/books/kimi"',
  "About page should link readers to the book itself.",
);
assertIncludes(
  "app/about/page.tsx",
  'href="/feed.xml"',
  "About page should expose the RSS feed.",
);
assertIncludes(
  "app/about/page.tsx",
  'href="/license"',
  "About page should link to the license.",
);
assertIncludes(
  "app/about/page.tsx",
  "/books/&lt;slug&gt;/llms.md",
  "About page should mention the per-book AI-readable Markdown route.",
);
assertIncludes(
  "app/about/page.tsx",
  "<Discussion />",
  "About page should include a site-level discussion section.",
);
assertFileIncludes(
  "lib/og-text.ts",
  "\\uFFFD",
  "OG text helper should sanitize Unicode replacement characters before ImageResponse tries dynamic fonts.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/opengraph-image.tsx",
  "ogText(ch?.lede",
  "Chapter OG image ledes should pass through ogText() before rendering.",
);
assertNotIncludes(
  "app/books/[slug]/page.tsx",
  "<span>Cover · 360 × 480</span>",
  "Book detail cover placeholder label must be conditional, not hard-coded.",
);
assertIncludes(
  "package.json",
  '"@lobehub/icons"',
  "Missing-cover book fallbacks should use @lobehub/icons for product logo cover art.",
);
assertIncludes(
  "lib/cover-art.tsx",
  "coverLogoForBook",
  "Book cover fallback should centralize product logo selection by book slug.",
);
assertIncludes(
  "components/CoverArt.tsx",
  "cover-art__logo",
  "CoverArt should render a dedicated logo/brand mark area when no real cover asset exists.",
);
assertIncludes(
  "components/BookCoverLogo.tsx",
  "@lobehub/icons/es/Kimi/components/Color",
  "Book cover logos should use narrow @lobehub/icons subpaths so each book only pulls the icons it needs.",
);
assertNotIncludes(
  "components/BookCoverLogo.tsx",
  'from "@lobehub/icons"',
  "Book cover logos should avoid the @lobehub/icons root entry to keep feature/UI helpers out of the bundle.",
);
assertIncludes(
  "components/BookCoverLogo.tsx",
  "book-cover-logo__combined",
  "Book cover logos should expose a combine-style logo+text mark for small cover fallbacks.",
);
assertIncludes(
  "components/BookCoverLogo.tsx",
  "book-cover-logo__tile",
  "Kimi cover fallback should compose the white-K mark inside the brand-filled tile.",
);
assertIncludes(
  "app/globals.css",
  "--cover-thumbnail-logo-size",
  "Small book cover fallbacks should use a dedicated thumbnail logo size instead of inheriting the full cover layout.",
);
assertIncludes(
  "app/globals.css",
  "--cover-combine-icon-size: 56px;",
  "Large book cover fallbacks should use the same combine-style product logo language as thumbnails.",
);
assertIncludes(
  "app/globals.css",
  "--cover-large-title-size",
  "Large book cover fallbacks should use a dedicated display title scale inspired by the cover reference.",
);
assertIncludes(
  "app/globals.css",
  ".featured__cover .cover-art::after",
  "Large book cover fallbacks should include the subtle lower-right dot texture from the cover reference.",
);
assertIncludes(
  "app/globals.css",
  ".featured__cover .cover-art__subtitle::before",
  "Large book cover fallbacks should add a short accent rule before the subtitle block.",
);
assertNotIncludes(
  "app/globals.css",
  ".featured__cover .cover-art__logo::before",
  "Large cover fallbacks should not add decorative logo badge chrome around combine-style product marks.",
);
assertIncludes(
  "app/globals.css",
  "--cover-brand-display: none;",
  "Book cover fallbacks should hide the extra cover brand label when the combine-style logo already includes product text.",
);
assertIncludes(
  "app/globals.css",
  "align-items: center;",
  "Small book cover fallbacks should center their logo/brand group horizontally.",
);

const forbiddenContent = [
  "Lorem ipsum",
  "Placeholder text",
  "PLACEHOLDER",
  "占位文本",
  "Lorem · 2026",
];

// Scan every chapter MDX under content/books for forbidden placeholder
// tokens. Chapter bodies are currently stubs ("draft in progress"); they
// must not regress into Lorem-ipsum / placeholder-text style fillers.
for (const bookDir of fs
  .readdirSync(path.join(root, "content/books"), { withFileTypes: true })
  .filter((d) => d.isDirectory())) {
  const chaptersRel = `content/books/${bookDir.name}/chapters`;
  if (!fs.existsSync(path.join(root, chaptersRel))) continue;
  for (const rel of walk(chaptersRel)) {
    if (!rel.endsWith(".mdx")) continue;
    const body = read(rel);
    for (const token of forbiddenContent) {
      if (body.includes(token)) {
        fail(`${rel} still contains forbidden placeholder token: ${token}`);
      }
    }
  }
}

assertIncludes(
  "components/T.tsx",
  "data-i18n-lang=\"zh\"",
  "<T> spans must carry data-i18n-lang so aria-hidden toggling never targets <html> or prose blocks.",
);
assertIncludes(
  "components/T.tsx",
  "data-i18n-lang=\"en\"",
  "<T> spans must carry data-i18n-lang so aria-hidden toggling never targets <html> or prose blocks.",
);
assertNotIncludes(
  "components/LangProvider.tsx",
  '`[lang="${lang}"]`',
  "LangProvider must not toggle aria-hidden by querying bare [lang]; that can hide <html>.",
);
assertIncludes(
  "components/LangProvider.tsx",
  "[data-i18n-lang",
  "LangProvider should only toggle aria-hidden on explicit bilingual text nodes.",
);

assertFileIncludes(
  "components/mdx/canon-figures.tsx",
  "learning-is-compression",
  "Canon figure data should include the learning-is-compression album.",
);
assertFileIncludes(
  "components/mdx/canon-figures.tsx",
  "good-spec-for-ai-agents",
  "Canon figure data should include the good-spec-for-ai-agents album.",
);
assertFileIncludes(
  "components/mdx/CanonAlbum.tsx",
  "data-carousel-slide",
  "Canon album component should render carousel slides for MDX usage.",
);
assertIncludes(
  "components/mdx/index.tsx",
  "CanonAlbum",
  "MDX component map should expose the CanonAlbum component.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "data-export-canon-figure",
  "GlobalUI should delegate Canon figure image exports.",
);
assertIncludes(
  "app/globals.css",
  ".figcard",
  "Canon album figcard styles should be present.",
);

assertFileIncludes(
  "lib/rehype-code-title.ts",
  "data-rehype-pretty-code-title",
  "Code title normalizer should preserve rehype-pretty-code's native title semantics.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/page.tsx",
  "rehypeCodeTitle",
  "Chapter MDX should normalize fenced code title metadata before rendering code blocks.",
);
assertIncludes(
  "components/mdx/blocks.tsx",
  "filename?:",
  "CodeBlock should accept a filename prop for top code headers.",
);
assertIncludes(
  "components/mdx/elements.tsx",
  "data-code-title",
  "Fenced code titles should be rendered by the v3 CodeFence component.",
);
assertIncludes(
  "app/globals.css",
  ".v3-codeblock__title",
  "Code filename headers should share one v3 title-strip style.",
);
assertIncludes(
  "app/globals.css",
  "Round-62 · Chapter footer rhythm",
  "Chapter pages should have a scoped footer rhythm pass for references, nav, discussion, and site footer.",
);
assertIncludes(
  "app/globals.css",
  ".ch-page + .v3-footer",
  "Chapter site footer spacing should be scoped to the chapter page rather than inheriting the global 96px gap.",
);
assertIncludes(
  "app/globals.css",
  ".ch-page > :is(.ch-nav, .next-book) + .discussion",
  "Chapter discussion spacing should connect to chapter nav / next-book rhythm without extra padding.",
);
assertIncludes(
  "app/globals.css",
  "Round-63 · Chapter dividers",
  "Chapter separators should have a scoped visual rhythm instead of the global divider treatment.",
);
assertIncludes(
  "app/globals.css",
  ".ch-page > .v3-divider::before",
  "Chapter dividers should tune the divider mark itself, not only surrounding margins.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  'className="ch-nav__meta"',
  "Chapter nav should expose a website-style meta row above prev/next links.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  'className="ch-nav__links"',
  "Chapter nav should render prev/next as a two-column links grid.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  'className="ch-nav__title"',
  "Chapter nav should show neighboring short chapter titles without requiring hover.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  'rel="prev"',
  "Chapter nav previous link should expose rel=prev.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  'rel="next"',
  "Chapter nav next link should expose rel=next.",
);
assertIncludes(
  "app/globals.css",
  "Round-64 · Website-style chapter nav",
  "Chapter nav should have a dedicated website-style two-column visual pass.",
);
assertIncludes(
  "app/globals.css",
  ".ch-nav__links > *",
  "Chapter nav links should share the website two-cell grid treatment.",
);
assertIncludes(
  "app/globals.css",
  ".ch-nav__link.is-empty",
  "Chapter nav should preserve grid structure when previous or next chapter is missing.",
);
assertFileIncludes(
  "lib/chapter-outline.ts",
  "extractChapterOutline",
  "Chapter pages should extract a dedicated website-style in-page outline from MDX.",
);
assertFileIncludes(
  "components/ChapterOutline.tsx",
  "data-chapter-outline",
  "Chapter outline should render as a separate page rail rather than an MDX content block.",
);
assertIncludes(
  "components/ChapterOutline.tsx",
  '<T zh="章内目录" en="TOC" />',
  "Chapter outline header label should be bilingual instead of hard-coded English.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/page.tsx",
  "bodyWithOutlineIds",
  "Chapter pages should compile MDX with generated outline anchors.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  "<ChapterOutline items={outline} />",
  "ChapterShell should mount the outline outside the reading column.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "toggleChapterOutline",
  "GlobalUI should own the chapter outline keyboard toggle.",
);
assertIncludes(
  "app/globals.css",
  "Round-65 · Chapter outline rail",
  "Chapter outline should have a dedicated website-style visual pass.",
);
assertNotIncludes(
  "README.md",
  "ChapterTOC",
  "README should document the current ChapterOutline rail instead of the removed ChapterTOC component.",
);
assertIncludes(
  "README.md",
  "ChapterOutline",
  "README should list the chapter outline rail in the chapter page architecture.",
);
assertNotIncludes(
  "AGENTS.md",
  "<ChapterTOC",
  "Agent brief should not tell agents to use the removed ChapterTOC MDX component.",
);
assertIncludes(
  "AGENTS.md",
  "ChapterOutline",
  "Agent brief should document the current automatic ChapterOutline behavior.",
);
assertIncludes(
  "app/globals.css",
  ".chapter-outline__link:focus-visible {\n    outline: 1.5px solid var(--accent);",
  "Chapter outline links should keep a visible keyboard focus ring instead of only clearing outline.",
);
assertIncludes(
  "app/globals.css",
  ".chapter-outline__toggle:focus-visible {\n    outline: 1.5px solid var(--accent);",
  "Chapter outline toggle should keep a visible keyboard focus ring.",
);
assertIncludes(
  "app/globals.css",
  "width: calc(var(--chapter-outline-width) + var(--chapter-outline-gap) + 2.5rem);",
  "Chapter outline hover corridor should cover rail, gap, and panel so the pointer can cross into the panel.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "const CHAPTER_OUTLINE_HOVER_GRACE_MS = 220;",
  "Chapter outline hover close delay should match the website TOC grace window.",
);

/* Internal dashboard hardening.
   The stats/login pages are internal tools. They should not be embeddable
   by another origin, even though the login/session model is lightweight. */
assertIncludes(
  "next.config.ts",
  'source: "/internal/:path*"',
  "Internal routes should have a scoped header rule for dashboard-only security headers.",
);
assertIncludes(
  "next.config.ts",
  'key: "X-Frame-Options", value: "DENY"',
  "Internal routes should send X-Frame-Options: DENY.",
);
assertIncludes(
  "next.config.ts",
  'key: "Content-Security-Policy", value: "frame-ancestors \'none\'"',
  "Internal routes should send a frame-ancestors 'none' CSP.",
);

/* Mobile chapter overflow guards.
   Hidden footnote popovers and wide tables should never make chapter pages
   horizontally scroll on phone-sized viewports. */
assertIncludes(
  "app/globals.css",
  "Round-68 · Mobile chapter overflow guards",
  "Mobile chapter pages should have a dedicated overflow guard pass.",
);
assertIncludes(
  "app/globals.css",
  ".ch-page .v3-fn-tip",
  "Mobile chapter pages should hide footnote hover popovers that can extend off-canvas while hidden.",
);
assertIncludes(
  "app/globals.css",
  ".ch-page .v3-table-wrap",
  "Mobile chapter tables should constrain their scroll container instead of widening the page.",
);
assertIncludes(
  "app/globals.css",
  ".ch-nav__index-wrap .ch-toc",
  "Mobile chapter pages should disable the old hover table-of-contents popover that can widen the viewport.",
);
assertIncludes(
  "app/globals.css",
  "box-sizing: border-box;",
  "Mobile chapter table wrappers should include border-box sizing to keep padding inside the viewport.",
);

const { extractChapterOutline } = await importTsModule("lib/chapter-outline.ts");
const outlineFixture = [
  '<SectionTitle number="I"><T zh="第一节" en="First" /></SectionTitle>',
  '<H3 id="custom-anchor"><T zh="自定义" en="Custom" /></H3>',
  '````md',
  '### <T zh="围栏内" en="Inside Fence" />',
  '<SectionTitle number="X"><T zh="围栏标题" en="Fenced Title" /></SectionTitle>',
  '```',
  '````',
  '### <T zh="Markdown 小节" en="Markdown Section" />',
  '<SectionTitle number="II"><T zh={<>带 <C>组件</C> 标题</>} en={<>Title with <C>Component</C></>} /></SectionTitle>',
].join("\n");
const outlineResult = extractChapterOutline(outlineFixture);
assertDeepEqual(
  outlineResult.outline.map((item) => ({
    id: item.id,
    level: item.level,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
  })),
  [
    { id: "section-i", level: 2, titleZh: "第一节", titleEn: "First" },
    { id: "custom-anchor", level: 3, titleZh: "自定义", titleEn: "Custom" },
    {
      id: "markdown-小节",
      level: 3,
      titleZh: "Markdown 小节",
      titleEn: "Markdown Section",
    },
    {
      id: "section-ii",
      level: 2,
      titleZh: "带 组件 标题",
      titleEn: "Title with Component",
    },
  ],
  "Chapter outline extraction should handle SectionTitle, H3, markdown H3, JSX fragments, and fenced code boundaries.",
);
if (!outlineResult.body.includes('<SectionTitle id="section-i" number="I">')) {
  fail("Chapter outline extraction should inject stable ids into SectionTitle blocks.");
}
if (!outlineResult.body.includes('<H3 id="markdown-小节">')) {
  fail("Chapter outline extraction should rewrite markdown H3 headings into anchored H3 components.");
}
if (outlineResult.outline.some((item) => item.titleZh.includes("围栏"))) {
  fail("Chapter outline extraction should ignore headings inside fenced code blocks, including four-backtick fences.");
}

/* cleanMdx() — the MDX → markdown cleanup used by /books/<slug>/llms.md.
   Extracted into lib/llms-clean-mdx.ts (no `@/` aliases, no fs) so it
   can be imported here directly. Fixture-test the v3 component
   vocabulary an Agent-facing markdown depends on, so a future MDX
   component or parser tweak can't silently break the AI-readable view. */
const { cleanMdx } = await importTsModule("lib/llms-clean-mdx.ts");

function assertCleanIncludes(input, needle, message) {
  const out = cleanMdx(input);
  if (!out.includes(needle)) {
    fail(`${message}\n  cleaned output:\n${out.split("\n").map((l) => `  | ${l}`).join("\n")}`);
  }
}
function assertCleanNotIncludes(input, needle, message) {
  const out = cleanMdx(input);
  if (out.includes(needle)) {
    fail(`${message}\n  cleaned output:\n${out.split("\n").map((l) => `  | ${l}`).join("\n")}`);
  }
}

// <T> → Chinese text (zh preferred, en is the fallback).
assertCleanIncludes(
  '<T zh="中文段" en="English piece" />',
  "中文段",
  "cleanMdx should keep the zh text from a <T> component.",
);
assertCleanNotIncludes(
  '<T zh="中文段" en="English piece" />',
  "English piece",
  "cleanMdx should not leak the unused en slot when zh is present.",
);

// <Callout> → blockquote.
assertCleanIncludes(
  '<Callout kind="tip" zh="注意这段" en="Note this" />',
  "> 注意这段",
  "cleanMdx should render a <Callout> as a markdown blockquote.",
);

// <CodeBlock> with filename + caption → fenced code with title.
assertCleanIncludes(
  '<CodeBlock filename="demo.ts" caption="说明">const x = 1;</CodeBlock>',
  "```text title=\"demo.ts\"",
  "cleanMdx should preserve the fenced code open with the filename title.",
);
assertCleanIncludes(
  '<CodeBlock filename="demo.ts" caption="说明">const x = 1;</CodeBlock>',
  "const x = 1;",
  "cleanMdx should preserve the code body inside a <CodeBlock>.",
);
assertCleanIncludes(
  '<CodeBlock filename="demo.ts" caption="说明">const x = 1;</CodeBlock>',
  "_说明_",
  "cleanMdx should render the <CodeBlock> caption as italic markdown above the fence.",
);
assertCleanIncludes(
  '<CodeBlock filename="demo.ts" caption="说明">const x = 1;</CodeBlock>',
  "```",
  "cleanMdx should close the fenced code block for a <CodeBlock>.",
);

// <Footnote> → [^n].
assertCleanIncludes(
  '正文。<Footnote n={1} />',
  "[^1]",
  "cleanMdx should turn a <Footnote n={1} /> into a [^1] marker.",
);

// Nested fragment inside <T zh={<>...</>}> — the nested self-closing
// <Footnote /> must not cut the fragment, and the footnote marker must
// land inline with the surrounding zh prose.
assertCleanIncludes(
  '<T zh={<>第一句<Footnote n={2} />第二句</>} en="One two" />',
  "第一句[^2]第二句",
  "cleanMdx should keep a nested <Footnote> inline inside a <T> zh fragment.",
);
assertCleanNotIncludes(
  '<T zh={<>第一句<Footnote n={2} />第二句</>} en="One two" />',
  "<Footnote",
  "cleanMdx should not leave a nested <Footnote> tag behind in a <T> fragment.",
);

// Structural components that carry no agent-readable text should be
// stripped entirely — no leftover JSX tags in the markdown output.
for (const structural of [
  '<Cover />',
  '<ChapterTOC />',
  '<References />',
  '<StopPunct />',
]) {
  assertCleanNotIncludes(
    `前面。\n${structural}\n后面。`,
    structural.slice(0, structural.indexOf(" ")),
    `cleanMdx should strip the structural component ${structural}.`,
  );
}

// No residual JSX tags from the v3 vocabulary should survive cleanup.
assertCleanNotIncludes(
  '<T zh="段一" />\n<Callout zh="段二" />\n<CodeBlock filename="x.ts">y</CodeBlock>',
  "<T",
  "cleanMdx should not leave <T tags in the output.",
);
assertCleanNotIncludes(
  '<T zh="段一" />\n<Callout zh="段二" />\n<CodeBlock filename="x.ts">y</CodeBlock>',
  "</T>",
  "cleanMdx should not leave </T> tags in the output.",
);
assertCleanNotIncludes(
  '<T zh="段一" />\n<Callout zh="段二" />\n<CodeBlock filename="x.ts">y</CodeBlock>',
  "<Callout",
  "cleanMdx should not leave <Callout tags in the output.",
);
assertCleanNotIncludes(
  '<T zh="段一" />\n<Callout zh="段二" />\n<CodeBlock filename="x.ts">y</CodeBlock>',
  "<CodeBlock",
  "cleanMdx should not leave <CodeBlock tags in the output.",
);

// Source-level guards: the route must import from the extracted module
// and must not re-declare a private cleanMdx.
assertIncludes(
  "app/books/[slug]/llms.md/route.ts",
  'from "@/lib/llms-clean-mdx"',
  "llms.md route should import cleanMdx from the extracted @/lib/llms-clean-mdx module.",
);
assertIncludes(
  "lib/llms-clean-mdx.ts",
  "export function cleanMdx",
  "lib/llms-clean-mdx.ts should export cleanMdx for direct testing.",
);
assertNotIncludes(
  "app/books/[slug]/llms.md/route.ts",
  "function cleanMdx(body: string): string {",
  "llms.md route must not re-declare a private cleanMdx — it lives in lib/llms-clean-mdx.ts now.",
);

assertNotIncludes(
  "lib/books.ts",
  "if (first) return `${first}-01`;",
  "RSS publish-date fallback must not collapse every chapter in the same revision month to the first day.",
);

/* chapterModifiedAt() must normalize revision dates correctly:
   full-date "YYYY-MM-DD" stays as-is, month "YYYY-MM" pads to
   "YYYY-MM-01", and chapters without revisions fall back to
   chapterPublishedAt(). Older code appended "-01" unconditionally,
   which turned a full date into an invalid "YYYY-MM-DD-01" and broke
   the sitemap's lastModified. The date helpers live in an alias-free
   module so this check imports and exercises the real implementation. */
const { chapterModifiedAt } = await importTsModule("lib/book-dates.ts");
const bookShape = { date: "2026-01-01" };
const fullDateChapter = { revisions: [{ v: 1, date: "2026-06" }, { v: 2, date: "2026-06-17" }] };
const monthDateChapter = { revisions: [{ v: 1, date: "2026-06" }] };
const noRevisionsChapter = { revisions: [], publishedAt: "2026-05-20" };

const fullDateResult = chapterModifiedAt(bookShape, fullDateChapter);
if (fullDateResult !== "2026-06-17") {
  fail(
    `chapterModifiedAt() should return the full revision date as-is, got "${fullDateResult}".`,
  );
}
const monthDateResult = chapterModifiedAt(bookShape, monthDateChapter);
if (monthDateResult !== "2026-06-01") {
  fail(
    `chapterModifiedAt() should pad a "YYYY-MM" revision to "YYYY-MM-01", got "${monthDateResult}".`,
  );
}
const noRevisionsResult = chapterModifiedAt(bookShape, noRevisionsChapter);
if (noRevisionsResult !== "2026-05-20") {
  fail(
    `chapterModifiedAt() should fall back to chapterPublishedAt() when no revisions exist, got "${noRevisionsResult}".`,
  );
}

assertIncludes(
  "lib/book-dates.ts",
  "function normalizeDate(date: string): string {",
  "chapterModifiedAt() should delegate to a normalizeDate() helper so month and full-date revisions share one path.",
);
assertNotIncludes(
  "lib/book-dates.ts",
  "if (last) return `${last}-01`;",
  "chapterModifiedAt() must not append -01 to revision dates unconditionally.",
);

assertIncludes(
  "lib/searchIndex.ts",
  "extractComponentText",
  "Search index should extract MDX component text, not only markdown ### headings.",
);
assertIncludes(
  "lib/searchIndex.ts",
  "searchText",
  "Search items should keep long searchable prose in searchText instead of display meta.",
);
assertNotIncludes(
  "app/layout.tsx",
  "buildSearchIndex",
  "Root layout should not inline the full search index into every HTML page.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  'fetch("/search-index.json")',
  "Global search should lazy-load the public search index when opened.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "if (q) return fuse.search(q).map((r) => r.item);",
  "Search queries should render Fuse relevance order instead of regrouping matches.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "debouncedQuery",
  "Global search should debounce query input before running Fuse search.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "SEARCH_DEBOUNCE_MS",
  "Global search debounce delay should be named and easy to tune.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "正在整理结果",
  "Global search should show a stable refining state while debounced results catch up.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  "没有匹配结果",
  "Global search empty state should clearly describe no matches.",
);
assertNotIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "new URLSearchParams({ secret",
  "Analytics dashboard must not send the dashboard secret in query params.",
);
assertFileIncludes(
  "app/internal/stats/page.tsx",
  "<AnalyticsDashboard />",
  "The shorter internal stats route should render the analytics dashboard.",
);

// The comment-area default must stay "enabled" — a silent "hidden"/"disabled"
// default would make whole discussion sections vanish unnoticed (a real
// regression in the sister project). commentsMode() in lib/books.ts owns it.
assertFileIncludes(
  "lib/books.ts",
  'chapter.comments ?? book.comments ?? "enabled"',
  'commentsMode() must resolve to "enabled" by default so chapter comments never silently disappear.',
);
assertIncludes(
  "app/internal/stats/page.tsx",
  "<SiteHeader />",
  "Stats page should reuse the site header for navigation and theme controls.",
);
assertIncludes(
  "app/internal/stats/page.tsx",
  "<SiteFooter />",
  "Stats page should reuse the site footer for consistent navigation.",
);
assertIncludes(
  "app/internal/analytics/page.tsx",
  'redirect("/internal/stats")',
  "The old analytics route should redirect to the shorter /internal/stats route.",
);
assertNotIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "sessionStorage",
  "Stats dashboard should use a server login session instead of client-side secret storage.",
);
assertNotIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Authorization",
  "Stats dashboard API calls should use the HttpOnly login cookie instead of an Authorization secret header.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "/api/analytics/login",
  "Stats dashboard should log in through the analytics login API.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "/api/analytics/password",
  "Stats dashboard should expose password update through the analytics password API.",
);

/* Stats auth hardening: login failure rate limit, initial secret
   minimum length, and constant-time session signature comparison. */
assertIncludes(
  "app/api/analytics/login/route.ts",
  "LOGIN_FAILURE_LIMIT",
  "Login route should declare a named failure limit constant.",
);
assertIncludes(
  "app/api/analytics/login/route.ts",
  "status: 429",
  "Login route should return 429 once the failure limit is hit.",
);
assertIncludes(
  "app/api/analytics/login/route.ts",
  "x-forwarded-for",
  "Login route should read the client IP from x-forwarded-for / x-real-ip.",
);
assertIncludes(
  "app/api/analytics/login/route.ts",
  "clearAttempts",
  "Login route should clear the failure counter on a successful login.",
);
assertIncludes(
  "lib/analytics-auth.ts",
  "INITIAL_SECRET_MIN_LENGTH",
  "Bootstrap stage should enforce a minimum initial ANALYTICS_SECRET length.",
);
assertIncludes(
  "lib/analytics-auth.ts",
  "Initial ANALYTICS_SECRET is too short",
  "A too-short initial secret should log a warning (without the secret value).",
);
assertNotIncludes(
  "lib/analytics-auth.ts",
  "(await sign(body)) !== signature",
  "Session signature comparison must be constant-time, not a string inequality.",
);
assertIncludes(
  "lib/analytics-auth.ts",
  "function verifySignature",
  "Session verification should go through a verifySignature() helper.",
);
assertIncludes(
  "lib/analytics-auth.ts",
  "timingSafeEqual(actual, expected)",
  "verifySignature() should compare buffers with timingSafeEqual.",
);

/* Tracked-target validation: the /event endpoint must reject forged
   book / chapter / page slugs so the dashboard can't be polluted by
   arbitrary external POSTs. Slugs must resolve to real published books
   / non-draft chapters / real static pages or tags — not just match
   the slug regex. */
assertIncludes(
  "app/api/analytics/event/route.ts",
  "getAllBooks",
  "Event route should resolve book targets against getAllBooks() so draft books can't be injected.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "getChapter",
  "Event route should validate chapterSlug via getChapter() so forged chapter slugs are rejected.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "isStaticPageSlug",
  "page_view targets should be validated via isStaticPageSlug() rather than only the slug regex.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "presentTags",
  "library-tag-* page targets should be validated against presentTags() of published books.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "validTagSlugs",
  "Event route should build a real tag-slug set and check page slugs against it.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "found.chapter.draft",
  "Draft chapters should be rejected by the event route so draft views don't pollute stats.",
);
assertNotIncludes(
  "app/api/analytics/event/route.ts",
  "if (!targetSlug || !SLUG_RE.test(targetSlug))",
  "Event route must not gate book/page targets on the slug regex alone — they must resolve to real content.",
);
assertFileIncludes(
  "lib/analytics-events.ts",
  "BOOK_ANALYTICS_EVENTS",
  "Analytics should define a shared book event dictionary.",
);
assertFileIncludes(
  "lib/analytics-events.ts",
  "PAGE_ANALYTICS_EVENTS",
  "Analytics should define a shared page/feed event dictionary.",
);
assertFileIncludes(
  "lib/analytics-events.ts",
  "STATIC_PAGE_SLUGS",
  "Analytics should define the non-book page slug dictionary.",
);
assertIncludes(
  "lib/db.ts",
  "BOOK_ANALYTICS_EVENTS",
  "Analytics queries should use the shared book event dictionary.",
);
assertIncludes(
  "lib/db.ts",
  "PAGE_ANALYTICS_EVENTS",
  "Analytics queries should use the shared page/feed event dictionary.",
);
assertIncludes(
  "lib/db.ts",
  "CREATE TABLE IF NOT EXISTS analytics_auth",
  "Analytics auth should persist the changed dashboard password hash.",
);

const analyticsEventColumns = [
  "visitor_id",
  "visitor_kind",
  "country",
  "region",
  "device",
  "browser",
  "os",
  "active_ms",
  "visible_ms",
  "scroll_depth",
];

const dbSource = read("lib/db.ts");
const eventsSchemaMatch = dbSource.match(
  /CREATE TABLE IF NOT EXISTS events \([\s\S]*?\n\);/,
);
const insertEventMatch = dbSource.match(
  /INSERT INTO events \(([\s\S]*?)\)\s*VALUES/,
);

for (const column of analyticsEventColumns) {
  if (!eventsSchemaMatch?.[0].includes(column)) {
    fail(`Analytics events schema should include ${column}.`);
  }
  if (!insertEventMatch?.[1].includes(column)) {
    fail(`insertEvent() INSERT should include ${column}.`);
  }
}

assertIncludes(
  "lib/db.ts",
  "ALTER TABLE events ADD COLUMN",
  "Analytics events schema changes must include an idempotent migration for existing databases.",
);
assertIncludes(
  "lib/db.ts",
  "PRAGMA table_info(events)",
  "Analytics events migration should inspect existing columns before adding new event fields.",
);
for (const forbiddenIpField of [
  "ip_address",
  "client_ip",
  "raw_ip",
  "hashed_ip",
  "ip_hash",
]) {
  assertNotIncludes(
    "lib/db.ts",
    forbiddenIpField,
    `Analytics must not persist ${forbiddenIpField}; store country/region only.`,
  );
}
for (const numericField of ["active_ms", "visible_ms", "scroll_depth"]) {
  assertIncludes(
    "lib/db.ts",
    numericField,
    `Analytics numeric normalization should cover ${numericField}.`,
  );
}
assertIncludes(
  "lib/db.ts",
  "Math.floor",
  "Analytics numeric normalization should floor fractional values before insert.",
);
assertIncludes(
  "lib/db.ts",
  "Math.min(100",
  "Analytics scroll depth normalization should clamp values to the 0-100 range.",
);

assertFileIncludes(
  "lib/analytics-visitor.ts",
  "visitorContextFromRequest",
  "Analytics visitor classification should live in lib/analytics-visitor.ts.",
);
assertFileIncludes(
  "lib/analytics-visitor.ts",
  "classifyUserAgent",
  "Analytics visitor helper should export classifyUserAgent().",
);
assertFileIncludes(
  "lib/analytics-visitor.ts",
  "x-vercel-ip-country",
  "Analytics visitor context should read country from the Vercel geo header.",
);
assertFileIncludes(
  "lib/analytics-visitor.ts",
  "x-vercel-ip-country-region",
  "Analytics visitor context should read region from the Vercel geo header.",
);
for (const uaNeedle of ["GPTBot", "ClaudeBot", "Googlebot", "Feedly"]) {
  assertFileIncludes(
    "lib/analytics-visitor.ts",
    uaNeedle,
    `Analytics visitor classification should recognize ${uaNeedle}.`,
  );
}

const analyticsEventRouteSource = read("app/api/analytics/event/route.ts");
if (!analyticsEventRouteSource.includes("visitorContextFromRequest")) {
  fail("Client analytics event route should call visitorContextFromRequest().");
}
if (analyticsEventRouteSource.includes("agent:")) {
  fail("Client analytics event route must not persist raw user-agent into the agent field.");
}
for (const column of [
  "visitor_id",
  "visitor_kind",
  "country",
  "region",
  "device",
  "browser",
  "os",
]) {
  if (!analyticsEventRouteSource.includes(column)) {
    fail(`Client analytics event route should pass ${column} to insertEvent().`);
  }
}

const analyticsServerSource = read("lib/analytics-server.ts");
if (!analyticsServerSource.includes("visitor_kind")) {
  fail("Server analytics events should pass visitor_kind for agent/feed reads.");
}
if (!analyticsServerSource.includes("classifyUserAgent")) {
  fail("Server analytics events should classify agent/feed user agents.");
}

const analyticsPrivacyFiles = [
  "lib/db.ts",
  "lib/analytics-server.ts",
  "app/api/analytics/event/route.ts",
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "app/feed.xml/route.ts",
  "app/books/[slug]/llms.md/route.ts",
];
if (fs.existsSync(path.join(root, "lib/analytics-visitor.ts"))) {
  analyticsPrivacyFiles.push("lib/analytics-visitor.ts");
}
for (const rel of analyticsPrivacyFiles) {
  for (const forbiddenIpField of [
    "ip_address",
    "client_ip",
    "raw_ip",
    "hashed_ip",
    "ip_hash",
  ]) {
    assertNotIncludes(
      rel,
      forbiddenIpField,
      `${rel} must not read or persist ${forbiddenIpField}; store country/region only.`,
    );
  }
}

if (fs.existsSync(path.join(root, "lib/analytics-visitor.ts"))) {
  const { classifyUserAgent, cleanVisitorId, visitorContextFromRequest } =
    await importTsModule("lib/analytics-visitor.ts");
  if (typeof cleanVisitorId !== "function") {
    fail("analytics-visitor.ts should export cleanVisitorId().");
  } else {
    assertDeepEqual(
      cleanVisitorId("  abc  "),
      "abc",
      "cleanVisitorId() should trim session / visitor ids consistently.",
    );
    assertDeepEqual(
      cleanVisitorId(`${"x".repeat(140)}`).length,
      128,
      "cleanVisitorId() should cap session / visitor ids at 128 characters.",
    );
  }
  assertDeepEqual(
    classifyUserAgent("Googlebot/2.1 (+http://www.google.com/bot.html)").visitor_kind,
    "search_bot",
    "Googlebot should classify as search_bot.",
  );
  assertDeepEqual(
    classifyUserAgent("GPTBot/1.0").visitor_kind,
    "ai_agent",
    "GPTBot should classify as ai_agent.",
  );
  assertDeepEqual(
    classifyUserAgent("Feedly/1.0").visitor_kind,
    "feed_reader",
    "Feedly should classify as feed_reader.",
  );
  assertDeepEqual(
    classifyUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
    ),
    {
      visitor_kind: "human",
      device: "desktop",
      browser: "Chrome",
      os: "macOS",
    },
    "Desktop Chrome should classify as a human Chrome visitor on macOS.",
  );
  assertDeepEqual(
    classifyUserAgent("Mozilla/5.0 Chrome/120.0 Safari/537.36", {
      fallbackKind: "ai_agent",
    }).visitor_kind,
    "ai_agent",
    "Agent reads with browser-like UA should use ai_agent fallback rather than human.",
  );
  assertDeepEqual(
    classifyUserAgent(null, { fallbackKind: "feed_reader" }).visitor_kind,
    "feed_reader",
    "Feed reads without UA should use feed_reader fallback rather than unknown.",
  );
  assertDeepEqual(
    visitorContextFromRequest(
      new Request("https://kimi.read.wiki/books/kimi", {
        headers: {
          "user-agent": "Mozilla/5.0 Chrome/120.0 Safari/537.36",
          "x-session-id": "session-123",
          "x-vercel-ip-country": "US",
          "x-vercel-ip-country-region": "CA",
        },
      }),
    ),
    {
      visitor_id: "session-123",
      visitor_kind: "human",
      country: "US",
      region: "CA",
      device: "desktop",
      browser: "Chrome",
      os: "Unknown",
    },
    "visitorContextFromRequest() should derive visitor id and geo fields from request headers.",
  );
}

assertIncludes(
  "lib/analytics-events.ts",
  "reading_heartbeat",
  "Analytics event dictionary should include reading_heartbeat.",
);
assertIncludes(
  "lib/analytics-client.ts",
  "visibleMs",
  "Client analytics should accept heartbeat visibleMs.",
);
assertIncludes(
  "lib/analytics-client.ts",
  "activeMs",
  "Client analytics should accept heartbeat activeMs.",
);
assertIncludes(
  "lib/analytics-client.ts",
  "scrollDepth",
  "Client analytics should accept heartbeat scrollDepth.",
);
assertIncludes(
  "lib/analytics-client.ts",
  "visible_ms",
  "Client analytics should map visibleMs to visible_ms.",
);
assertIncludes(
  "lib/analytics-client.ts",
  "active_ms",
  "Client analytics should map activeMs to active_ms.",
);
assertIncludes(
  "lib/analytics-client.ts",
  "scroll_depth",
  "Client analytics should map scrollDepth to scroll_depth.",
);
const clientDedupSource = read("lib/analytics-client.ts");
const dedupExemptMatch = clientDedupSource.match(/const dedupExempt =[\s\S]*?;/);
if (
  !dedupExemptMatch ||
  !dedupExemptMatch[0].includes('"reading_heartbeat"') ||
  !dedupExemptMatch[0].includes('"page_view"')
) {
  fail(
    "reading_heartbeat / page_view must be exempt from the once-per-session dedup branch (dedupExempt).",
  );
}
assertIncludes(
  "app/api/analytics/event/route.ts",
  "reading_heartbeat",
  "Event route should allow and validate reading_heartbeat.",
);
for (const column of ["visible_ms", "active_ms", "scroll_depth"]) {
  assertIncludes(
    "app/api/analytics/event/route.ts",
    column,
    `Event route should pass ${column} to insertEvent() for reading heartbeat.`,
  );
}
assertNotIncludes(
  "app/api/analytics/event/route.ts",
  "String(body.sessionId).slice(0, 128)",
  "Event route should use the shared visitor id cleaner, not duplicate session id slicing.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "cleanVisitorId",
  "Event route should use cleanVisitorId() for session_id and visitor_id.",
);

const chapterTrackerSource = read("app/books/[slug]/[chapter]/ChapterTracker.tsx");
for (const heartbeatNeedle of [
  "reading_heartbeat",
  "visibilitychange",
  "pagehide",
  "scroll",
  "keydown",
  "pointerdown",
  "touchstart",
  "60 * 60 * 1000",
]) {
  if (!chapterTrackerSource.includes(heartbeatNeedle)) {
    fail(`ChapterTracker heartbeat should include ${heartbeatNeedle}.`);
  }
}
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterTracker.tsx",
  "track({",
  "ChapterTracker heartbeat should flush through the analytics client.",
);

const bookTotalEventsMatch = read("lib/analytics-events.ts").match(
  /export const BOOK_TOTAL_ANALYTICS_EVENTS = \[[\s\S]*?\] as const;/,
);
if (bookTotalEventsMatch?.[0].includes("reading_heartbeat")) {
  fail("BOOK_TOTAL_ANALYTICS_EVENTS must not include reading_heartbeat.");
}

for (const overviewField of [
  "audience",
  "engagement",
  "funnel",
  "visitor_kind",
  "country",
  "device",
  "browser",
  "reading_heartbeat",
  "MAX(active_ms)",
  "MAX(visible_ms)",
  "MAX(scroll_depth)",
  "depth_85_rate",
  "engaged_sessions",
]) {
  assertIncludes(
    "lib/db.ts",
    overviewField,
    `Analytics overview should return/query ${overviewField}.`,
  );
}
for (const forbiddenHeartbeatAggregate of [
  "SUM(active_ms)",
  "SUM(visible_ms)",
  "SUM(scroll_depth)",
]) {
  assertNotIncludes(
    "lib/db.ts",
    forbiddenHeartbeatAggregate,
    `Heartbeat aggregation must not use ${forbiddenHeartbeatAggregate}; heartbeat rows are cumulative snapshots.`,
  );
}

const audienceBreakdownMatch = dbSource.match(
  /async function queryAudienceBreakdowns\([\s\S]*?\n}\n\nfunction heartbeatScope/,
);
const audienceBreakdownSource = audienceBreakdownMatch?.[0] ?? "";
if (!audienceBreakdownSource.includes("audience_session_key")) {
  fail("Audience breakdowns should count deduplicated audience sessions, not raw event rows.");
}
if (!audienceBreakdownSource.includes("COALESCE(session_id, visitor_id, 'event-' || id)")) {
  fail("Audience breakdowns should derive a stable session key from session_id / visitor_id / event id.");
}
if (
  !audienceBreakdownSource.includes(
    "GROUP BY ${column}, COALESCE(session_id, visitor_id, 'event-' || id)",
  ) &&
  !audienceBreakdownSource.includes("COUNT(DISTINCT")
) {
  fail("Audience breakdowns should group by dimension plus deduped session key or use COUNT(DISTINCT ...).");
}
if (
  /SELECT\s+\$\{column\},\s*COUNT\(\*\) as count\s+FROM events[\s\S]*GROUP BY\s+\$\{column\}/.test(
    audienceBreakdownSource,
  )
) {
  fail("Audience breakdowns must not directly COUNT(*) raw event rows by dimension.");
}

const legacyBookViewMatch = dbSource.match(
  /if \(view === "book" && opts\.bookSlug\) \{[\s\S]*?\n  \}\n\n  return \{ error: "invalid view" \};/,
);
const legacyBookViewSource = legacyBookViewMatch?.[0] ?? "";
if (
  !legacyBookViewSource.includes("BOOK_TOTAL_ANALYTICS_EVENTS") &&
  !legacyBookViewSource.includes("bookTotalTypeSql")
) {
  fail("Legacy view=book dailyTrend should filter to BOOK_TOTAL_ANALYTICS_EVENTS.");
}
if (
  /FROM events WHERE book_slug = \? AND ts >= \?\s+GROUP BY day ORDER BY day/.test(
    legacyBookViewSource,
  )
) {
  fail("Legacy view=book dailyTrend must not count every event without a type filter.");
}

/* Turso / libsql schema migrations must be awaited before any query,
   otherwise cold-start races the first login / event / query against
   an unbuilt schema and login silently fails until migration settles.
   The old code was `client.execute(stmt).catch(() => {})` in a loop —
   fire-and-forget, errors swallowed. */
assertNotIncludes(
  "lib/db.ts",
  "client.execute(stmt).catch(() => {})",
  "Turso schema migration must be awaited, not fired-and-forgotten with swallowed errors.",
);
assertIncludes(
  "lib/db.ts",
  "schemaReady",
  "Turso branch should track schema readiness via a schemaReady promise.",
);
assertIncludes(
  "lib/db.ts",
  "await schemaReady",
  "driver.run / driver.all should await schemaReady before executing on Turso.",
);
assertNotIncludes(
  "lib/db.ts",
  "Promise.all(\n      schemaStatements().map",
  "Turso schema migration should run sequentially because indexes depend on tables created by earlier statements.",
);
assertIncludes(
  "lib/db.ts",
  "for (const stmt of schemaStatements())",
  "Turso schema migration should preserve statement order.",
);
assertIncludes(
  "lib/db.ts",
  "await client.execute(stmt);",
  "Turso schema migration should await each schema statement before starting the next one.",
);
assertIncludes(
  "lib/db.ts",
  "Failed to initialize Turso schema",
  "Turso migration failure should log a visible error so the outage is observable.",
);
assertIncludes(
  "lib/db.ts",
  "function schemaStatements",
  "Schema statement splitting should live in a named helper to avoid duplication.",
);
assertIncludes(
  "lib/db.ts",
  "warnLocalProductionDb",
  "Production running on the default local SQLite path should emit a one-shot warning.",
);
assertIncludes(
  "lib/db.ts",
  "warnedInsertFailure",
  "insertEvent() should log the first failure (not all) so a silent DB outage surfaces.",
);
assertIncludes(
  "README.md",
  "libsql://your-db.turso.io",
  "README should document the Turso production DATABASE_URL requirement.",
);
assertIncludes(
  ".env.example",
  "DATABASE_AUTH_TOKEN",
  ".env.example should document the Turso DATABASE_AUTH_TOKEN env var.",
);

for (const [needle, message] of [
  [
    "ANALYTICS_SECRET",
    "README should document the analytics dashboard bootstrap secret.",
  ],
  [
    "DATABASE_URL",
    "README should document the durable analytics DATABASE_URL.",
  ],
  [
    "DATABASE_AUTH_TOKEN",
    "README should document the Turso / libsql DATABASE_AUTH_TOKEN.",
  ],
  [
    "不保存原始 IP",
    "README should state that analytics does not store raw IP addresses.",
  ],
  [
    "不保存 IP hash",
    "README should state that analytics does not store IP hashes.",
  ],
  [
    "x-vercel-ip-country",
    "README should document the Vercel country geo header.",
  ],
  [
    "x-vercel-ip-country-region",
    "README should document the Vercel region geo header.",
  ],
  [
    "visible_ms",
    "README should document visible_ms reading-time semantics.",
  ],
  [
    "active_ms",
    "README should document active_ms reading-time semantics.",
  ],
  [
    "heartbeat",
    "README should document the reading heartbeat semantics.",
  ],
  [
    "MAX",
    "README should document heartbeat MAX aggregation before averages / funnels.",
  ],
]) {
  assertIncludes("README.md", needle, message);
}

for (const [needle, message] of [
  [
    "ANALYTICS_SECRET",
    ".env.example should document the analytics dashboard bootstrap secret.",
  ],
  [
    "DATABASE_URL",
    ".env.example should document the durable analytics DATABASE_URL.",
  ],
  [
    "DATABASE_AUTH_TOKEN",
    ".env.example should document the Turso / libsql DATABASE_AUTH_TOKEN.",
  ],
]) {
  assertIncludes(".env.example", needle, message);
}

for (const [needle, message] of [
  [
    "ANALYTICS_SECRET",
    "Smoke test should optionally log into stats with ANALYTICS_SECRET.",
  ],
  [
    "#stats-tab-insights",
    "Smoke test should check the Insights tab selector when authenticated.",
  ],
  [
    "#stats-panel-insights",
    "Smoke test should check the Insights panel selector when authenticated.",
  ],
  [
    ".toLowerCase()",
    "Smoke test should check Insights panel text case-insensitively.",
  ],
  [
    "engagement",
    "Smoke test should check the Insights engagement copy.",
  ],
  [
    "funnel",
    "Smoke test should check the Insights funnel copy.",
  ],
  [
    "audience",
    "Smoke test should check the Insights audience copy.",
  ],
  [
    "Checking session",
    "Smoke test should tolerate the unauthenticated stats session check state.",
  ],
  [
    "Log In",
    "Smoke test should tolerate the unauthenticated stats login state.",
  ],
]) {
  assertIncludes("scripts/smoke.mjs", needle, message);
}

/* Vercel serverless uses output file tracing for function bundles.
   /search-index.json and /books/[slug]/llms.md are dynamic routes
   that fs.readFile the chapter MDX at request time — the tracer
   cannot follow that, so the MDX files must be listed in
   outputFileTracingIncludes or the routes 500 on Vercel. */
assertIncludes(
  "next.config.ts",
  "outputFileTracingIncludes",
  "next.config.ts should declare outputFileTracingIncludes for dynamic routes that read content from the filesystem.",
);
assertIncludes(
  "next.config.ts",
  '"/search-index.json"',
  "outputFileTracingIncludes should cover the /search-index.json route.",
);
assertIncludes(
  "next.config.ts",
  '"/books/[slug]/llms.md"',
  "outputFileTracingIncludes should cover the /books/[slug]/llms.md route.",
);
assertIncludes(
  "next.config.ts",
  '"./content/books/**/*.mdx"',
  "outputFileTracingIncludes should bundle the chapter MDX glob for both routes.",
);
assertIncludes(
  "lib/db.ts",
  "bookTotals",
  "Analytics overview should return a dedicated book totals block.",
);
assertIncludes(
  "lib/db.ts",
  "pageTotals",
  "Analytics overview should return a dedicated page/feed totals block.",
);
assertIncludes(
  "lib/db.ts",
  "topPages",
  "Analytics overview should return a dedicated top-pages table outside book rankings.",
);
assertIncludes(
  "lib/db.ts",
  "quickWindows",
  "Analytics overview should expose 24h, 7d, and 30d quick summary windows.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Books Panel",
  "Stats dashboard should render a distinct Books panel.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Pages Panel",
  "Stats dashboard should render a distinct Pages panel.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "an-tabs",
  "Stats dashboard should switch Books and Pages through tabs.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Account Panel",
  "Stats dashboard should move account controls into the top tab navigation.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "insights",
  "Stats dashboard should expose an Insights tab.",
);
for (const insightsNeedle of [
  "audience",
  "engagement",
  "funnel",
  "fmtDuration",
  "depth_85_rate",
]) {
  assertIncludes(
    "app/internal/analytics/AnalyticsDashboard.tsx",
    insightsNeedle,
    `Insights dashboard should render ${insightsNeedle}.`,
  );
}
for (const dashboardNeedle of ["Insights", "Audience", "Engagement", "Funnel"]) {
  assertIncludes(
    "app/internal/analytics/AnalyticsDashboard.tsx",
    dashboardNeedle,
    `Stats dashboard should render ${dashboardNeedle}.`,
  );
}
for (const forbiddenStatsField of [
  "ip_address",
  "client_ip",
  "raw_ip",
  "hashed_ip",
  "ip_hash",
]) {
  assertNotIncludes(
    "app/internal/analytics/AnalyticsDashboard.tsx",
    forbiddenStatsField,
    `Stats dashboard must not display or reference ${forbiddenStatsField}.`,
  );
}
assertIncludes(
  "app/globals.css",
  "Round-69 · Stats insights panel",
  "Stats insights styles should be appended in a Round-69 block.",
);
assertIncludes(
  "app/api/analytics/session/route.ts",
  "passwordUpdatedAt",
  "Stats session API should expose password update time for the Account tab.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Signed in as",
  "Account tab should show the current signed-in user.",
);
assertIncludes(
  "app/api/analytics/session/route.ts",
  "expiresAt",
  "Stats session API should expose the current session expiry time.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Session expires",
  "Account tab should display when the stats session expires.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "QuickSummary",
  "Stats dashboard should render compact quick summary cards.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "24h",
  "Stats dashboard should include a 24h quick summary window.",
);
assertIncludes(
  "lib/analytics-display.ts",
  "pageLabelForSlug",
  "Stats dashboard should map page slugs to readable labels.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "pageLabelForSlug",
  "Stats dashboard should display readable page labels.",
);
assertIncludes(
  "lib/analytics-display.ts",
  "referrerCategory",
  "Analytics display helpers should classify referrers.",
);
assertIncludes(
  "lib/db.ts",
  "topReferrerCategories",
  "Analytics overview should return referrer category totals.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Referrer Categories",
  "Pages panel should render grouped referrer categories.",
);
assertIncludes(
  "lib/db.ts",
  "completion_rate",
  "Analytics overview should compute completion rate server-side.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Completion Rate",
  "Books panel should promote completion rate as a main metric.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "overviewRequestSeqRef",
  "Stats dashboard overview fetches should guard against stale concurrent responses.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Last updated",
  "Stats dashboard should show when the overview data was last refreshed.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Updating",
  "Stats dashboard should show an updating state while overview data is refreshing.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "tabIndex={0}",
  "Stats dashboard clickable table rows should be keyboard focusable.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "onKeyDown",
  "Stats dashboard clickable table rows should support keyboard activation.",
);
assertIncludes(
  "app/globals.css",
  ".an-table__clickable:focus-visible td",
  "Stats dashboard clickable table rows should share hover and keyboard focus styling.",
);
assertIncludes(
  "components/Discussion.tsx",
  "type DiscussionState",
  "Discussion should model configured/loading/loaded/failed states explicitly.",
);
assertIncludes(
  "components/Discussion.tsx",
  "data-discussion-state={discussionState}",
  "Discussion should expose its load state for debugging and styling.",
);
assertIncludes(
  "components/Discussion.tsx",
  'discussionState === "loaded"',
  "Discussion should include an explicit loaded state once giscus posts a ready message.",
);
assertIncludes(
  "components/Discussion.tsx",
  'discussionState === "unconfigured"',
  "Discussion should render a distinct unconfigured state when env vars are missing.",
);
assertNotIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "const EVENT_TYPES = [",
  "Stats dashboard should not render one mixed event-card set for books and pages.",
);
assertIncludes(
  "app/about/page.tsx",
  '<PageTracker pageSlug="about" />',
  "About visits should be tracked as page views.",
);
assertIncludes(
  "app/feed.xml/route.ts",
  "trackFeedRead",
  "RSS visits should be tracked as feed reads, not book views.",
);
assertIncludes(
  "app/license/page.tsx",
  '<PageTracker pageSlug="license" />',
  "License visits should be tracked as page views, not book views.",
);
assertNotIncludes(
  "app/api/analytics/query/route.ts",
  'searchParams.get("secret")',
  "Analytics query API should require the login session cookie instead of a secret query param.",
);
assertIncludes(
  "app/api/analytics/query/route.ts",
  "requireAnalyticsSession",
  "Analytics query API should validate the stats login session.",
);
assertIncludes(
  "lib/db.ts",
  "const HUMAN_OR_TRACKED",
  "Human-facing analytics metrics must exclude bot/crawler events via the shared filter (agent_read/feed_read stay counted; the Audience breakdown stays full).",
);
assertIncludes(
  "app/api/analytics/rollup/route.ts",
  "pruneOldEvents",
  "The rollup route must also prune raw events past the retention window, not just roll up — this is what keeps the events table bounded.",
);
assertIncludes(
  "vercel.json",
  '"path": "/api/analytics/rollup"',
  "A Vercel cron must schedule the analytics rollup + prune job.",
);
// ② Durable visitor identity — a first-party localStorage id, distinct from the
// per-tab session id, is what unique / returning-visitor metrics key on.
assertIncludes(
  "lib/analytics-client.ts",
  "localStorage.getItem(VISITOR_KEY)",
  "Client tracker must persist a durable visitor id in localStorage (distinct from the per-tab sessionStorage session id).",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "cleanVisitorId(body.visitorId)",
  "Event route must store the client's durable visitorId as visitor_id (falling back to the session id for legacy clients), keeping session_id distinct.",
);
assertIncludes(
  "lib/db.ts",
  "const HUMAN_ONLY",
  "Unique / returning-visitor counts need the strictly-human filter (no agent_read/feed_read escape hatch), so AI agents and feed readers aren't counted as people.",
);
for (const visitorMetric of ["unique_visitors", "returning_visitors"]) {
  assertIncludes(
    "lib/db.ts",
    visitorMetric,
    `queryAnalytics overview must compute ${visitorMetric} from the durable visitor_id.`,
  );
}
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Unique Visitors",
  "Analytics dashboard should surface the unique-visitor metric.",
);
// ⑧ Every analytics API route must pin the node runtime — they all transitively
// import node-only deps (better-sqlite3 / libsql / scrypt) via db / analytics-auth.
for (const analyticsRoute of [
  "app/api/analytics/event/route.ts",
  "app/api/analytics/login/route.ts",
  "app/api/analytics/logout/route.ts",
  "app/api/analytics/password/route.ts",
  "app/api/analytics/query/route.ts",
  "app/api/analytics/rollup/route.ts",
  "app/api/analytics/session/route.ts",
]) {
  assertIncludes(
    analyticsRoute,
    'export const runtime = "nodejs"',
    `${analyticsRoute} must pin the node runtime (uses node-only DB / crypto).`,
  );
}
// ⑤ Ingestion limits — the public event endpoint caps body size and rate.
assertIncludes(
  "lib/analytics-rate-limit.ts",
  "export function checkIngestRateLimit",
  "The public ingestion endpoint needs an in-memory rate limiter.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "MAX_INGEST_BODY_BYTES",
  "Event route must cap request body size to reject oversized payloads.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "checkIngestRateLimit",
  "Event route must rate-limit ingestion per client id.",
);
for (const abuseStatus of ["status: 413", "status: 429"]) {
  assertIncludes(
    "app/api/analytics/event/route.ts",
    abuseStatus,
    `Event route must reject abusive ingestion with ${abuseStatus.replace("status: ", "HTTP ")}.`,
  );
}
// ⑥ DB failures must surface to the operator, not vanish behind an opaque 500.
assertIncludes(
  "app/api/analytics/query/route.ts",
  'error: "database"',
  "Query route must catch DB failures and return a structured error the dashboard can render.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Database unavailable",
  "Dashboard must surface a structured DB failure in the error banner.",
);
// Tier-3 correctness — completion-rate clamp, zero-filled trends, book-scoped
// referrers.
assertIncludes(
  "lib/db.ts",
  "MIN(100, ROUND(",
  "completion_rate must be clamped at 100% — chapter_complete can outrun chapter_view across window boundaries.",
);
assertIncludes(
  "lib/db.ts",
  "function zeroFillDailyTrend",
  "Daily trends must be zero-filled so empty days aren't dropped from the chart's x-axis.",
);
assertIncludes(
  "lib/db.ts",
  "const referrerBaseWhere",
  "Referrers must scope to the selected book (its book/chapter events) when filtering, not stay site-wide.",
);
// Tier-3 new tracking — outbound clicks, search queries, 404s.
assertIncludes(
  "lib/analytics-events.ts",
  "SIGNAL_ANALYTICS_EVENTS",
  "Signal event types (outbound_click / search_query / not_found) must be declared in the shared vocabulary.",
);
assertIncludes(
  "app/api/analytics/event/route.ts",
  "function sanitizeSignalDetail",
  "Signal payloads must be sanitized (host-only outbound, normalized query, path-only 404) before storage.",
);
for (const signalType of ["outbound_click", "search_query", "not_found"]) {
  assertIncludes(
    "app/api/analytics/event/route.ts",
    `"${signalType}"`,
    `Event route must accept the ${signalType} signal.`,
  );
}
assertIncludes(
  "lib/db.ts",
  "const signalTopSql",
  "queryAnalytics must surface top signals (outbound / searches / 404s).",
);
assertIncludes(
  "components/GlobalUI.tsx",
  'type: "outbound_click"',
  "GlobalUI must track outbound-link clicks.",
);
assertIncludes(
  "components/GlobalUI.tsx",
  'type: "search_query"',
  "GlobalUI must track settled search queries.",
);
assertIncludes(
  "app/not-found.tsx",
  "NotFoundTracker",
  "The 404 boundary must mount the not-found tracker.",
);
assertIncludes(
  "app/internal/analytics/AnalyticsDashboard.tsx",
  "Top Searches",
  "Dashboard must surface the signal tables (searches / outbound / 404s).",
);
// gap ⑦ — the analytics logic has a committed unit/integration suite wired into
// `npm test`, so the metrics / route / rollup behavior stays covered by tests
// (not just one-off scripts).
assertIncludes(
  "package.json",
  '"test:unit"',
  "npm test must run the analytics unit suite (test:unit) so the backend logic stays covered.",
);
for (const suiteFile of [
  "tests/analytics/db-metrics.test.ts",
  "tests/analytics/db-visitors.test.ts",
  "tests/analytics/event-route.test.ts",
  "tests/analytics/query-route.test.ts",
  "tests/analytics/rollup.test.ts",
]) {
  if (!fs.existsSync(path.join(root, suiteFile))) {
    fail(`Missing analytics test file: ${suiteFile}`);
  }
}
assertNotIncludes(
  "app/feed.xml/route.ts",
  'trackAgentRead("_feed"',
  "Public RSS cache misses should not be counted as feed/agent reads.",
);
assertIncludes(
  "app/books/[slug]/llms.md/route.ts",
  '"Cache-Control": "no-store"',
  "Agent markdown routes should use no-store so each read can be tracked at origin.",
);
assertIncludes(
  "lib/types.ts",
  'language: "zh-en" | "zh"',
  "BookMeta.language should be constrained to the supported language modes.",
);
assertIncludes(
  "DESIGN.md",
  "Style System Hardening Checklist",
  "Design docs should include the final style-system hardening checklist for visual QA, print/PDF, interaction, and scope discipline.",
);
assertIncludes(
  "README.md",
  "Bilingual PDF exports",
  "README should document the zh/en PDF export contract so generated PDFs do not drift from the current language mode.",
);
assertIncludes(
  "components/mdx/blocks.tsx",
  '<T zh={zh ?? en ?? ""} en={en} />',
  "Callout should reuse <T> fallback so zh-only callouts do not go blank in EN mode.",
);
assertIncludes(
  "app/books/[slug]/page.tsx",
  "export const dynamicParams = false;",
  "Book detail route should disable unspecified dynamic params.",
);

assertIncludes(
  "scripts/build-pdfs.mjs",
  "isDraftBook",
  "PDF generator should skip book-level draft entries before discovering print routes.",
);
assertIncludes(
  "scripts/build-pdfs.mjs",
  "response.status()",
  "PDF generator should fail on bad print route HTTP status instead of writing 404 PDFs.",
);
assertIncludes(
  "scripts/build-pdfs.mjs",
  '`${slug}.en.pdf`',
  "PDF generator should emit a separate English PDF for bilingual books instead of reusing the Chinese export.",
);
assertIncludes(
  "scripts/build-pdfs.mjs",
  "?lang=${lang}",
  "PDF generator should force the print route language so browser-local language state cannot leak between exports.",
);
assertIncludes(
  "app/layout.tsx",
  "new URLSearchParams(location.search).get('lang')",
  "The pre-hydration language script should honor ?lang=en for PDF/print rendering before CSS paints.",
);
assertIncludes(
  "components/LangProvider.tsx",
  "document.documentElement.dataset.lang",
  "LangProvider should seed its state from the pre-hydrated html data-lang instead of always starting in Chinese.",
);
assertIncludes(
  "components/LangProvider.tsx",
  "new URLSearchParams(window.location.search).get(\"lang\")",
  "LangProvider should preserve ?lang=en after hydration for print/PDF routes.",
);
assertIncludes(
  "app/books/[slug]/PdfDownloadLink.tsx",
  "hrefEn",
  "PDF download link should expose a language-specific English href.",
);
assertIncludes(
  "app/books/[slug]/PdfDownloadLink.tsx",
  "useLang",
  "PDF download link should choose the export href from the current reading language.",
);
assertIncludes(
  "app/books/[slug]/PdfDownloadLink.tsx",
  "setActiveHref",
  "PDF download link should update href after hydration; otherwise the server-rendered Chinese href can survive in English mode.",
);

assertIncludes(
  "lib/books.ts",
  "getPreviousBook",
  "Book navigation should expose getPreviousBook() so next-book recommendations have a reverse path.",
);
assertIncludes(
  "app/books/[slug]/[chapter]/ChapterShell.tsx",
  "getPreviousBook(book.slug)",
  "ChapterShell should resolve the previous book for the terminal next-book recommendation.",
);
assertIncludes(
  "components/mdx/NextBook.tsx",
  "previousBook",
  "NextBook should accept a previousBook prop and render a reverse link.",
);
assertIncludes(
  "components/mdx/NextBook.tsx",
  "next-book__backlink",
  "NextBook should render a styled reverse backlink.",
);

assertMissing(
  "lib/chapter-toc.ts",
  "Automatic chapter mini-TOC extraction should be removed.",
);
assertMissing(
  "components/mdx/ChapterTOC.tsx",
  "Automatic ChapterTOC component should be removed.",
);
assertNotIncludes(
  "app/globals.css",
  "v3-chapter-toc",
  "Chapter mini-TOC styles should be removed with the feature.",
);
assertNotIncludes(
  "components/mdx/index.tsx",
  "ChapterTOC",
  "MDX component map should not register the removed ChapterTOC feature.",
);
assertNotIncludes(
  "components/mdx/index.tsx",
  "tocItems",
  "MDX chapter context should not carry removed mini-TOC data.",
);
assertNotIncludes(
  "app/globals.css",
  "Chapter mini-TOC",
  "Chapter mini-TOC CSS comments should be removed with the feature.",
);
assertNotIncludes(
  "app/books/[slug]/[chapter]/page.tsx",
  "extractChapterToc",
  "Chapter pages should not extract automatic mini-TOC data.",
);
assertNotIncludes(
  "app/books/[slug]/[chapter]/page.tsx",
  "bodyWithToc",
  "Chapter pages should compile the original MDX body without mini-TOC injection.",
);
assertNotIncludes(
  "README.md",
  "<ChapterTOC>",
  "README TODO should not list ChapterTOC once automatic mini-TOC is implemented.",
);

assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "bookPrintCover(book, serial, charCount)",
  "Print route should render the designed full-bleed print cover (the two-column jacket: masthead + text + wave card + colophon), not an old text-only cover.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  'className="print-cover__art"',
  "Print cover should include a dedicated cover-art frame on the PDF first page.",
);

/* Print route must not silently drop a chapter whose MDX read / compile
   fails. The old code did `catch { return null }` and then
   `entry ? <article> : null`, producing a 200 PDF that was quietly
   missing a chapter. Now a failed non-draft chapter logs its slug and
   re-throws so the route 500s and build-pdfs.mjs refuses to ship the
   bad PDF. Draft chapters still render <DraftNotice> without reading
   the MDX file. */
assertNotIncludes(
  "app/books/[slug]/print/page.tsx",
  "} catch {\n        return null;\n      }",
  "Print route must not swallow chapter render failures with a silent null return.",
);
assertNotIncludes(
  "app/books/[slug]/print/page.tsx",
  "entry ? (\n            <article className=\"print-chapter\"",
  "Print route must not gate chapter articles on a nullable entry — failures should 500, not drop a chapter.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "[print] Failed to render",
  "Print route should log the book + chapter slug when a chapter render fails.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "throw error;",
  "Print route should re-throw after logging so the route 500s instead of returning a partial PDF.",
);

/* Print route must use the same rehype-pretty-code + rehype-code-title
   pipeline as the chapter page so PDF code blocks match the online
   reading experience (syntax highlighting + filename title strip). */
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "rehypePrettyCode",
  "Print route should use rehype-pretty-code for syntax-highlighted code blocks.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "rehypeCodeTitle",
  "Print route should use rehype-code-title so code filename headers render in the PDF.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "ZHAPHAR_CODE_THEMES",
  "Print route should use the same ZHAPHAR_CODE_THEMES as the chapter page.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "keepBackground: false",
  "Print route should keep rehype-pretty-code background off (v3 CSS owns the surface).",
);
assertIncludes(
  "app/books/[slug]/[chapter]/page.tsx",
  "from \"@/lib/code-theme\"",
  "Chapter page should import the shared code theme module.",
);
assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "from \"@/lib/code-theme\"",
  "Print route should import the shared code theme module, not duplicate the theme constant.",
);

assertIncludes(
  "app/books/[slug]/print/page.tsx",
  "<DraftNotice chapter={chapter} number={chapterNumber(index)} />",
  "Draft chapters in the print route should still render the DraftNotice placeholder.",
);
assertIncludes(
  "lib/types.ts",
  "coverTitle?: string;",
  "Chapter metadata should support a cover-only display title for rare long H1s.",
);
assertIncludes(
  "components/mdx/Cover.tsx",
  "chapter.coverTitle ?? chapter.title",
  "Chapter covers should prefer coverTitle while preserving the canonical title for metadata/search/RSS.",
);
assertIncludes(
  "components/mdx/DraftNotice.tsx",
  "chapter.coverTitle ?? chapter.title",
  "Draft chapter covers should use the same coverTitle fallback as published chapters.",
);
assertIncludes(
  "app/globals.css",
  ".v3-cover--chapter .v3-cover__title",
  "Chapter cover title wrapping should be scoped to chapter covers, not list/detail titles.",
);
assertIncludes(
  "app/globals.css",
  "text-wrap: pretty;",
  "Chapter cover title wrapping should avoid forced balanced multi-line breaks.",
);
assertIncludes(
  "app/globals.css",
  "Round-76 · About title scale sync",
  "About page H1 should stay on the same display scale as library/license/chapter covers.",
);
assertIncludes(
  "app/globals.css",
  ".about-library__title,\n  :root[data-lang=\"en\"] .about-library__title",
  "About page title scale override should cover both zh and en modes.",
);
assertIncludes(
  "app/globals.css",
  "Round-77 · PDF chapter title sync",
  "PDF chapter cover titles should stay synced with the current editorial title system.",
);
assertIncludes(
  "app/globals.css",
  ".print-book .v3-cover--chapter .v3-cover__title",
  "PDF chapter title overrides should be scoped to generated book PDFs.",
);
assertIncludes(
  "app/globals.css",
  "font-size: 24pt;",
  "PDF chapter cover titles should not use the oversized legacy 28pt scale.",
);
assertNotIncludes(
  "app/globals.css",
  ".v3-section { page-break-before: always;",
  "PDF export must not force every section title onto a standalone page.",
);
assertIncludes(
  "app/globals.css",
  ".v3-tabs__panel { display: block !important; }",
  "PDF export should print every tab panel instead of only the active interactive panel.",
);
assertIncludes(
  "app/globals.css",
  ".v3-tabs__panel::before",
  "PDF export should label stacked tab panels after hiding the interactive tab bar.",
);
assertIncludes(
  "app/globals.css",
  "--print-code-font:",
  "PDF code blocks need a CJK font fallback so Chinese prompt/code samples do not lose glyphs.",
);
assertNotIncludes(
  "app/globals.css",
  ".v3-kicker { page-break-before: always;",
  "PDF chapter kicker summaries should flow with the chapter instead of starting a standalone page.",
);
assertIncludes(
  "app/globals.css",
  "@page :first {\n    margin: 0;",
  "PDF print cover page should use a full-bleed first page without the normal text margins.",
);
assertNotIncludes(
  "app/globals.css",
  "width: 92mm;",
  "PDF print cover should not be constrained to a small fixed 92mm width.",
);
assertIncludes(
  "app/globals.css",
  "@bottom-left  { content: none; }",
  "PDF print cover page should suppress the normal page counter footer.",
);
assertIncludes(
  "app/globals.css",
  ".print-cover__art {\n    width: 210mm;\n    height: 297mm;",
  "PDF print cover art should fill an A4 page instead of only the printable text block.",
);
assertIncludes(
  "app/globals.css",
  ".print-jacket__masthead",
  "PDF print cover (the two-column jacket) needs a masthead band (imprint + serial) so it reads as a catalogued publication.",
);
assertIncludes(
  "app/globals.css",
  ".print-jacket__card",
  "PDF print cover should carry the flowing-gradient cover card on the right, mirroring the web detail hero.",
);
assertIncludes(
  "app/globals.css",
  ".print-book .v3-fn-tip",
  "Print source pages should hide footnote hover popovers so hidden tooltips do not create horizontal overflow.",
);

/* Footnote ↔ references parity.
   Every <Footnote n={N} /> in chapter MDX must have a matching id in the
   frontmatter `references:` list, and vice versa. Without this you get
   either orphan references (rendered at the end with no in-text link) or
   broken footnote markers (the tooltip is empty). */
function parseFrontmatterRefIds(body) {
  const m = body.match(/^---\s*([\s\S]*?)\s*---/);
  if (!m) return new Set();
  const fm = m[1];
  if (!/^references\s*:/m.test(fm)) return new Set();
  return new Set(
    [...fm.matchAll(/^\s*-\s*id\s*:\s*(\d+)/gm)].map((g) => Number(g[1])),
  );
}

for (const rel of walk("content/books")) {
  if (!rel.endsWith(".mdx")) continue;
  const body = read(rel);
  const declared = parseFrontmatterRefIds(body);
  const used = new Set(
    [...body.matchAll(/<Footnote\s+n=\{(\d+)\}/g)].map((g) => Number(g[1])),
  );
  const missing = [...used].filter((n) => !declared.has(n));
  if (missing.length) {
    fail(
      `${rel}: <Footnote n={${missing.join(",")}}/> used but not declared in frontmatter references.`,
    );
  }
  // Orphan refs (declared in frontmatter, never cited via <Footnote/>)
  // are intentionally allowed: stub chapters often ship a curated
  // reading-list of authoritative sources via <References /> alone,
  // before any prose lands. Once the body is written, citations can
  // be added inline. The missing-citation direction stays strict.
}

/* readMinutes ↔ chapters[].readTime parity.
   The book-level readMinutes is shown across home / library / detail / RSS,
   so it must match the sum of chapter readTime (tolerance ±1). */
for (const rel of walk("content/books")) {
  if (!rel.endsWith("meta.ts")) continue;
  const body = read(rel);
  const chapterCount = [...body.matchAll(/^\s*slug\s*:\s*"[^"]+"/gm)].length - 1;
  const publishedAt = [...body.matchAll(/publishedAt\s*:\s*"(\d{4}-\d{2}-\d{2})"/g)];
  if (publishedAt.length !== chapterCount) {
    fail(
      `${rel}: every chapter must define publishedAt (found ${publishedAt.length}/${chapterCount}).`,
    );
  }
  const declaredMatch = body.match(/readMinutes\s*:\s*(\d+)/);
  if (!declaredMatch) continue;
  const declared = Number(declaredMatch[1]);
  const sum = [...body.matchAll(/readTime\s*:\s*"(\d+)\s*MIN"/g)].reduce(
    (a, m) => a + Number(m[1]),
    0,
  );
  if (Math.abs(declared - sum) > 1) {
    fail(
      `${rel}: readMinutes=${declared} disagrees with sum of chapter readTime=${sum} (tolerance ±1).`,
    );
  }
}

/* ── Printed TOC must fit on one page (Round-95) ──
   The print 目录 lists every chapter on the PDF's second page. Measured under
   Chromium print emulation, an A4 page minus the @page margins leaves
   251mm ≈ 948.7px; after Round-95 the title block costs 68.3px and each row
   43.4px, so 20 rows fit. A book with more chapters than that silently
   strands its tail on a near-empty third page (which is exactly what
   opencode / fde / primer did at the old 15-row capacity).

   Guard the invariant here so a longer book fails the gate instead. If a
   book legitimately needs more chapters, retune Round-95 (row padding and
   title gap) and raise this number to the newly measured capacity. */
const PRINT_TOC_MAX_ROWS = 20;
assertIncludes(
  "app/globals.css",
  "Round-95 · Printed TOC fits on one page",
  "Print TOC row density should be owned by a documented Round-95 block.",
);
for (const rel of walk("content/books")) {
  if (!rel.endsWith("meta.ts")) continue;
  const body = read(rel);
  const [bookMeta] = body.split(/\n\s*chapters\s*:/);
  if (/^\s*draft\s*:\s*true\s*,?\s*$/m.test(bookMeta)) continue;
  const chapters = [...body.matchAll(/readTime\s*:\s*"\d+\s*MIN"/g)].length;
  if (chapters > PRINT_TOC_MAX_ROWS) {
    fail(
      `${rel}: ${chapters} chapters exceeds the printed TOC capacity of ${PRINT_TOC_MAX_ROWS} rows — the last ${chapters - PRINT_TOC_MAX_ROWS} would orphan onto their own PDF page. Retune Round-95 and raise PRINT_TOC_MAX_ROWS.`,
    );
  }
}

/* ── Cover + detail intro discipline (Round-80) ──
   The book cover and detail page render the short `lede` as tagline / intro
   (the full `description` stays for OG / RSS / search) and a `coverTitle`
   (falling back to `title`) capped at ~2 lines. Guard those invariants so a
   new book can't regress to a paragraph-length cover or a 3-line title:
   - every non-draft book needs a `lede` (bilingual books need `ledeEn` too);
   - a long `title` / `titleEn` needs a `coverTitle` / `coverTitleEn`, and the
     coverTitle itself must stay tight enough to sit in 2 lines. */
{
  // Approximate rendered width in "CJK-width units" (a CJK / fullwidth glyph
  // ≈ 1, a Latin glyph ≈ 0.55) so a mixed Brand-Latin + CJK title isn't
  // over-counted — e.g. "OpenCode · 你指模型的 agent" fits 2 lines despite 22 chars.
  const CJK = /[⺀-鿿＀-￯　-〿]/;
  const width = (s) =>
    s ? [...s].reduce((w, ch) => w + (CJK.test(ch) ? 1 : 0.55), 0) : 0;
  const NEEDS_COVER = 20; // a title wider than this needs a coverTitle for 2 lines
  const COVER_MAX = 20; // a coverTitle wider than this likely wraps to 3 lines
  const dirs = fs
    .readdirSync(path.join(root, "content/books"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  for (const slug of dirs) {
    const rel = `content/books/${slug}/meta.ts`;
    if (!fs.existsSync(path.join(root, rel))) continue;
    let m;
    try {
      ({ meta: m } = await importTsModule(rel));
    } catch {
      continue;
    }
    if (m.draft) continue;
    if (!m.lede)
      fail(
        `${rel}: non-draft book needs a \`lede\` — the cover + detail intro fall back to the full \`description\` without it.`,
      );
    if (m.language === "zh-en" && !m.ledeEn)
      warn(
        `${rel}: bilingual book should set \`ledeEn\` — the English cover + detail intro fall back to the full description.`,
      );
    if (width(m.title) > NEEDS_COVER && !m.coverTitle)
      warn(
        `${rel}: title "${m.title}" is wide with no \`coverTitle\` — the cover + H1 may exceed 2 lines.`,
      );
    if (width(m.titleEn) > NEEDS_COVER && !m.coverTitleEn)
      warn(
        `${rel}: titleEn "${m.titleEn}" is wide with no \`coverTitleEn\` — the cover + H1 may exceed 2 lines.`,
      );
    const covZh = m.coverTitle || m.title;
    const covEn = m.coverTitleEn || m.titleEn;
    if (width(covZh) > COVER_MAX)
      warn(
        `${rel}: cover title "${covZh}" is wide (> ~${COVER_MAX} CJK units) — likely 3 lines on the cover.`,
      );
    if (m.language === "zh-en" && width(covEn) > COVER_MAX)
      warn(
        `${rel}: cover title (en) "${covEn}" is wide — likely 3 lines on the cover.`,
      );
  }
}

/* ── Publishing manifest coverage ──
   lib/books.ts is a static import manifest: a book that isn't imported
   and added to BOOKS is completely unreachable (no route, no library
   row, no RSS, no search). Catch the two directions of drift:

   (1) a content/books/<slug>/meta.ts exists but isn't in BOOKS — the
       book is invisible to the whole site;
   (2) a BOOKS entry points at a meta.ts that doesn't exist — the build
       would already fail on the import, but make the failure readable
       here too.

   Also enforce that the declared top-level `slug:` in each meta.ts
   matches its directory name — a mismatch silently breaks every
   `getBook(slug)` lookup. */
const booksDir = path.join(root, "content/books");
const contentBookSlugs = fs
  .readdirSync(booksDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
const metaByDir = new Map();
for (const slug of contentBookSlugs) {
  const rel = `content/books/${slug}/meta.ts`;
  if (!fs.existsSync(path.join(root, rel))) {
    fail(`${rel}: missing — every book directory needs a meta.ts.`);
    continue;
  }
  const body = read(rel);
  // First `slug: "..."` line is the top-level book slug (chapters also
  // declare slug: but they come later, inside the chapters array).
  const slugMatch = body.match(/^\s*slug\s*:\s*"([^"]+)"/m);
  if (!slugMatch) {
    fail(`${rel}: missing top-level \`slug:\` field.`);
    continue;
  }
  const declaredSlug = slugMatch[1];
  if (declaredSlug !== slug) {
    fail(
      `${rel}: declared slug "${declaredSlug}" does not match directory name "${slug}".`,
    );
  }
  metaByDir.set(slug, { rel, body });
}

// Parse lib/books.ts imports + BOOKS array entries. The manifest uses
// `import { meta as <local> } from "@/content/books/<slug>/meta"`, then
// the BOOKS array lists the imported local names. Both steps matter:
// an import without a BOOKS entry still leaves the book unreachable.
const booksTs = read("lib/books.ts");
const bookImportEntries = [
  ...booksTs.matchAll(
    /import\s+\{\s*meta\s+as\s+([A-Za-z_$][\w$]*)\s*\}\s+from\s+"@\/content\/books\/([^/]+)\/meta"/g,
  ),
].map((m) => ({ local: m[1], slug: m[2] }));
const importByLocal = new Map(bookImportEntries.map((entry) => [entry.local, entry.slug]));
const localByImportedSlug = new Map(bookImportEntries.map((entry) => [entry.slug, entry.local]));
const importedSlugs = new Set(bookImportEntries.map((entry) => entry.slug));
const booksArrayMatch = booksTs.match(/const\s+BOOKS:\s*BookMeta\[\]\s*=\s*\[([\s\S]*?)\];/);
if (!booksArrayMatch) {
  fail("lib/books.ts: missing BOOKS manifest array.");
}
const bookManifestLocals = booksArrayMatch
  ? [...booksArrayMatch[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)].map((m) => m[1])
  : [];
const bookManifestLocalSet = new Set(bookManifestLocals);
const manifestSlugs = new Set(
  bookManifestLocals
    .map((local) => importByLocal.get(local))
    .filter((slug) => typeof slug === "string"),
);
for (const slug of contentBookSlugs) {
  const local = localByImportedSlug.get(slug);
  if (!local) {
    fail(
      `content/books/${slug}/meta.ts exists but is not imported in lib/books.ts — ` +
        `this book is unreachable (no route, no library, no RSS, no search). ` +
        `Add it to the BOOKS manifest.`,
    );
    continue;
  }
  if (!bookManifestLocalSet.has(local)) {
    fail(
      `content/books/${slug}/meta.ts is imported as "${local}" in lib/books.ts ` +
        `but "${local}" is missing from the BOOKS array — this book is still unreachable.`,
    );
  }
}
for (const slug of importedSlugs) {
  if (!metaByDir.has(slug)) {
    fail(
      `lib/books.ts imports "@/content/books/${slug}/meta" but no such meta.ts exists.`,
    );
  }
}
for (const local of bookManifestLocals) {
  if (!importByLocal.has(local)) {
    fail(
      `lib/books.ts BOOKS array contains "${local}", but there is no matching meta import.`,
    );
  }
}
for (const slug of manifestSlugs) {
  if (!metaByDir.has(slug)) {
    fail(
      `lib/books.ts BOOKS array includes "@/content/books/${slug}/meta", but no such meta.ts exists.`,
    );
  }
}

/* ── Chapter source files: every non-draft chapter must have a matching
   .mdx on disk. Draft chapters are allowed to exist without a file (the
   route renders a placeholder). We check all books, including draft ones,
   so that removing a draft flag doesn't accidentally surface a missing file. */
for (const slug of contentBookSlugs) {
  const meta = metaByDir.get(slug);
  if (!meta) continue;
  const slugMatches = [...meta.body.matchAll(/slug\s*:\s*"([^"]+)"/g)];
  // First slug is the book-level slug; the rest are chapter slugs.
  const chapterSlugMatches = slugMatches.slice(1);
  for (const match of chapterSlugMatches) {
    const chSlug = match[1];
    const idx = match.index;
    const nextMatch = chapterSlugMatches.find((m) => m.index > idx);
    const end = nextMatch ? nextMatch.index : meta.body.length;
    const slice = meta.body.slice(idx, end);
    const isDraft = /draft\s*:\s*true/.test(slice);
    if (isDraft) continue;
    const chPath = path.join(
      root,
      "content",
      "books",
      slug,
      "chapters",
      `${chSlug}.mdx`,
    );
    if (!fs.existsSync(chPath)) {
      fail(
        `content/books/${slug}/meta.ts: chapter "${chSlug}" is not draft but ` +
          `content/books/${slug}/chapters/${chSlug}.mdx is missing.`,
      );
    }
  }
}

/* ── Bilingual metadata integrity ──
   `language: "zh-en"` is a real publishing contract, not a loose UI mode.
   If a book opts into bilingual output, English mode, PDF export, search,
   RSS, and llms.md all need complete English titles/descriptions instead
   of silently falling back to Chinese. */
function getStringField(source, field) {
  const match = source.match(new RegExp(`\\b${field}\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return match ? match[1].trim() : undefined;
}
function hasNonEmptyStringField(source, field) {
  const value = getStringField(source, field);
  return typeof value === "string" && value.length > 0;
}

for (const slug of manifestSlugs) {
  const meta = metaByDir.get(slug);
  if (!meta) continue;
  const top = bookMetaTopSection(meta.body);
  const language = getStringField(top, "language") ?? "zh-en";

  if (language !== "zh-en") continue;

  for (const field of ["titleEn", "descriptionEn"]) {
    if (!hasNonEmptyStringField(top, field)) {
      fail(
        `${meta.rel}: language is "zh-en" but top-level ${field} is missing or empty.`,
      );
    }
  }
  if (hasNonEmptyStringField(top, "lede") && !hasNonEmptyStringField(top, "ledeEn")) {
    fail(
      `${meta.rel}: language is "zh-en" and top-level lede exists, but ledeEn is missing or empty.`,
    );
  }

  const slugMatches = [...meta.body.matchAll(/slug\s*:\s*"([^"]+)"/g)];
  const chapterSlugMatches = slugMatches.slice(1);
  for (const match of chapterSlugMatches) {
    const chSlug = match[1];
    const idx = match.index;
    const nextMatch = chapterSlugMatches.find((m) => m.index > idx);
    const end = nextMatch ? nextMatch.index : meta.body.length;
    const slice = meta.body.slice(idx, end);
    if (/draft\s*:\s*true/.test(slice)) continue;

    if (!hasNonEmptyStringField(slice, "titleEn")) {
      fail(
        `${meta.rel}: bilingual chapter "${chSlug}" is missing a non-empty titleEn.`,
      );
    }
    if (hasNonEmptyStringField(slice, "lede") && !hasNonEmptyStringField(slice, "ledeEn")) {
      fail(
        `${meta.rel}: bilingual chapter "${chSlug}" has lede but is missing ledeEn.`,
      );
    }
  }
}

/* ── nextBook chain warnings (non-blocking) ──
   A published book's nextBook may point at a draft (the author stages
   the next book ahead of writing it) — that's allowed and the chain
   auto-resumes once the draft flag drops. But a nextBook pointing at a
   slug that doesn't exist at all is a real broken link the author
   probably wants to know about. Both surface as warnings (not failures)
   so staging a future book as draft doesn't block CI. */
const draftRe = /^\s*draft\s*:\s*true\s*,?\s*$/m;
function bookMetaTopSection(body) {
  return body.split(/\n\s*chapters\s*:/)[0] ?? body;
}
function isDraftMeta(slug) {
  const meta = metaByDir.get(slug);
  if (!meta) return false;
  return draftRe.test(bookMetaTopSection(meta.body));
}
for (const slug of manifestSlugs) {
  const meta = metaByDir.get(slug);
  if (!meta) continue;
  if (isDraftMeta(slug)) continue;
  const nextBookMatch = meta.body.match(/^\s*nextBook\s*:\s*"([^"]+)"/m);
  if (!nextBookMatch) continue;
  const target = nextBookMatch[1];
  if (!metaByDir.has(target)) {
    warn(
      `content/books/${slug}/meta.ts: nextBook points at "${target}" which does not exist ` +
        `(no content/books/${target}/ directory).`,
    );
    continue;
  }
  if (isDraftMeta(target)) {
    warn(
      `content/books/${slug}/meta.ts: nextBook points at draft book "${target}" — ` +
        `the chain auto-resumes once the draft flag is removed.`,
    );
  }
}

/* ── SEO discovery surfaces: sitemap, robots, site-level llms.txt ──
   These are the AI/search entry points. They must exist, must only
   enumerate published books (getAllBooks), and robots must keep
   internal / API / print routes out while pointing at the sitemap. */
function assertExists(rel, message) {
  if (!fs.existsSync(path.join(root, rel))) fail(message);
}

assertExists(
  "app/sitemap.ts",
  "Site must expose a sitemap.ts so search engines and AI agents can discover all published surfaces.",
);
assertExists(
  "app/robots.ts",
  "Site must expose a robots.ts to steer crawlers away from internal / API / print routes.",
);
assertExists(
  "app/llms.txt/route.ts",
  "Site must expose a site-level /llms.txt index so AI agents can discover every published book from one URL.",
);

/* ── Mini Program content API contract ──
   The WeChat Mini Program (kimi-cookbook-miniapp) reads the book through
   /api/mp/v1. Pin the surface: routes exist, the chapters route follows
   the site's static-params model, and the renderer degrades MDX to the
   restricted HTML subset mp-html understands (behavioral coverage lives
   in smoke.mjs against the live server). */
assertExists(
  "app/api/mp/v1/book/route.ts",
  "Mini Program book API route must exist.",
);
assertExists(
  "app/api/mp/v1/chapters/[slug]/route.ts",
  "Mini Program chapter API route must exist.",
);
assertExists(
  "app/api/mp/v1/version/route.ts",
  "Mini Program cache-invalidation version route must exist.",
);
assertExists(
  "app/api/mp/qr.png/route.ts",
  "Mini Program share-poster QR route must exist.",
);
assertIncludes(
  "app/api/mp/qr.png/route.ts",
  'target.host !== ALLOWED_HOST',
  "Poster QR route must pin the url param to this site's own host.",
);
assertExists(
  "lib/mp-render.tsx",
  "Mini Program MDX → restricted-HTML renderer must exist.",
);
assertIncludes(
  "app/api/mp/v1/chapters/[slug]/route.ts",
  "export const dynamicParams = false;",
  "Mini Program chapter API should disable unspecified dynamic params.",
);
assertIncludes(
  "app/api/mp/v1/chapters/[slug]/route.ts",
  "generateStaticParams",
  "Mini Program chapter API should prerender every chapter.",
);
assertIncludes(
  "app/api/mp/v1/book/route.ts",
  'dynamic = "force-static"',
  "Mini Program book API should be statically generated.",
);
assertIncludes(
  "lib/mp-render.tsx",
  "renderToStaticMarkup",
  "Mini Program renderer should compile MDX to a static HTML string.",
);
assertIncludes(
  "lib/mp-render.tsx",
  "sanitizeHtml",
  "Mini Program renderer should sanitize the emitted HTML subset.",
);
assertIncludes(
  "lib/mp-render.tsx",
  "extractChapterOutline",
  "Mini Program renderer should inject outline ids like the web chapter page so in-chapter navigation works.",
);
assertIncludes(
  "lib/mp-render.tsx",
  'id="kc-refs"',
  "Mini Program references block should carry the kc-refs anchor for jump-to-references.",
);
assertNotIncludes(
  "lib/mp-render.tsx",
  "rehypeAutolinkHeadings",
  "Mini Program HTML should not carry self-link heading anchors a Mini Program can't navigate.",
);
assertIncludes(
  "next.config.ts",
  '"/api/mp/v1/chapters/[slug]"',
  "Standalone output must trace chapter MDX for the Mini Program chapter API.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "/api/mp/v1/book",
  "Smoke must cover the Mini Program book API.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "/api/mp/v1/chapters/08-code",
  "Smoke must cover the Mini Program chapter HTML contract.",
);

assertIncludes(
  "app/sitemap.ts",
  "getAllBooks()",
  "Sitemap must derive its entries from getAllBooks() so draft books and draft-only surfaces never leak into the index.",
);
assertIncludes(
  "app/sitemap.ts",
  "chapterModifiedAt",
  "Sitemap chapter entries should use chapterModifiedAt() for an accurate lastModified date.",
);
assertIncludes(
  "app/sitemap.ts",
  "absoluteUrl",
  "Sitemap URLs should be built with absoluteUrl() so the canonical origin comes from SITE_URL, not a hard-coded host.",
);
assertNotIncludes(
  "app/sitemap.ts",
  "localhost",
  "Sitemap must not hard-code localhost; use absoluteUrl() / SITE_URL.",
);
assertNotIncludes(
  "app/sitemap.ts",
  "/internal/",
  "Sitemap must not include any /internal/ routes.",
);
assertNotIncludes(
  "app/sitemap.ts",
  "/api/",
  "Sitemap must not include any /api/ routes.",
);
assertNotIncludes(
  "app/sitemap.ts",
  "/print",
  "Sitemap must not include per-book /print routes (those are noindex PDF sources, not reading surfaces).",
);
assertNotIncludes(
  "app/sitemap.ts",
  "/llms.md",
  "Sitemap must not include per-book /llms.md routes (those are agent-readable mirrors, tracked separately).",
);
assertIncludes(
  "app/sitemap.ts",
  'chapter.draft',
  "Sitemap must skip draft chapters explicitly so a draft chapter never appears as an indexable URL.",
);

assertIncludes(
  "app/robots.ts",
  'allow: "/"',
  "Robots should allow all public content by default.",
);
assertIncludes(
  "app/robots.ts",
  '"/internal/"',
  "Robots must disallow /internal/ so the stats dashboard and showcase stay out of the index.",
);
assertIncludes(
  "app/robots.ts",
  '"/api/"',
  "Robots must disallow /api/ so analytics endpoints stay out of the index.",
);
assertIncludes(
  "app/robots.ts",
  '"/books/*/print"',
  "Robots must disallow /books/*/print so PDF source pages stay out of the index.",
);
assertIncludes(
  "app/robots.ts",
  'sitemap: absoluteUrl("/sitemap.xml")',
  "Robots must point at the sitemap via absoluteUrl() so crawlers find the canonical discovery URL.",
);

assertIncludes(
  "app/llms.txt/route.ts",
  "getAllBooks()",
  "Site-level /llms.txt must enumerate books via getAllBooks() so draft books never leak into the agent index.",
);
assertIncludes(
  "app/llms.txt/route.ts",
  "absoluteUrl",
  "Site-level /llms.txt URLs should be built with absoluteUrl() so agents see the canonical origin.",
);
assertIncludes(
  "app/llms.txt/route.ts",
  '"public, max-age=3600"',
  "Site-level /llms.txt should be publicly cacheable for an hour to match the feed freshness window.",
);
assertIncludes(
  "app/llms.txt/route.ts",
  "/llms.md",
  "Site-level /llms.txt should link each book's AI-readable markdown route.",
);
assertIncludes(
  "app/llms.txt/route.ts",
  "/license",
  "Site-level /llms.txt should state the content license and link /license for agents.",
);

/* ── llms.md route hardening ──
   The route must not silently swallow a missing chapter file. A previous
   regression did `catch { raw = "" }` which produced a 200 response with
   an empty chapter body. We now log and throw so the route 500s, and we
   guard against the regression coming back. */
assertNotIncludes(
  "app/books/[slug]/llms.md/route.ts",
  "catch {\n        raw = \"\";\n      }",
  "llms.md route must not silently swallow a missing chapter file with an empty fallback.",
);
assertIncludes(
  "app/books/[slug]/llms.md/route.ts",
  '[llms] Failed to read',
  "llms.md route should log the book and chapter slug when a chapter file read fails.",
);
assertIncludes(
  "app/books/[slug]/llms.md/route.ts",
  "throw error;",
  "llms.md route must re-throw after logging so a missing file results in a 500, not an empty chapter.",
);

/* ── Smoke test script ──
   A browser-level smoke test guards against regressions that static
   analysis cannot catch: interactive search, theme/lang toggles,
   tab switching, print route rendering, and overflow.
   The script must exist and cover key paths and assertions. */
assertExists(
  "scripts/smoke.mjs",
  "Smoke test script must exist for launch-critical browser coverage.",
);
assertIncludes(
  "package.json",
  '"test:smoke"',
  "package.json must expose a test:smoke script so CI can run it.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "/books/warp",
  "Smoke test must cover deleted-book 404 behavior.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "/books/kimi/06-swarm",
  "Smoke test must cover search result targeting the expected Swarm chapter.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "/books/kimi/print",
  "Smoke test must cover the print route for code-block rendering verification.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "kimi.pdf",
  "Smoke test should verify that the PDF download points at the static kimi.pdf export.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "data-search-toggle",
  "Smoke test must exercise the global search toggle.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "国际站",
  "Smoke test should locate a chapter tab by accessible text instead of relying on a fragile data-tab order.",
);
assertIncludes(
  "scripts/smoke.mjs",
  "SMOKE_BASE_URL",
  "Smoke test must support the SMOKE_BASE_URL env override.",
);

/* ── OG font resilience ──
   OG image routes fetch Google Fonts at build time. A single transient
   network error used to fail the whole route with no retry. We now
   retry the CSS and font-file fetches with a timeout and clean the
   cache on failure so the next request can retry. */
assertIncludes(
  "lib/og-fonts.ts",
  "MAX_FONT_FETCH_ATTEMPTS",
  "OG font loader must define a named max-attempt constant for retry logic.",
);
assertIncludes(
  "lib/og-fonts.ts",
  "AbortSignal.timeout",
  "OG font fetch must have a timeout so a hanging request does not stall the build forever.",
);
assertIncludes(
  "lib/og-fonts.ts",
  "fontCache.delete(key)",
  "OG font loader must remove a failed promise from the cache so subsequent requests can retry.",
);
assertIncludes(
  "lib/og-fonts.ts",
  "loadGoogleFont",
  "OG font loader must still export loadGoogleFont for OG image routes.",
);
assertNotIncludes(
  "lib/og-fonts.ts",
  "await fetch(cssUrl)",
  "OG font loader must not call a raw un-timed fetch for the CSS endpoint.",
);
assertNotIncludes(
  "lib/og-fonts.ts",
  "await fetch(match[1])",
  "OG font loader must not call a raw un-timed fetch for the font file endpoint.",
);

/* ── Tsanger subset freshness (non-blocking) ──
   scripts/gen-tsanger-subset.mjs subsets the CJK font to the glyphs the site
   renders and records them in tsanger-glyphs.txt. If content later introduces a
   glyph the committed subset lacks, that char falls back to the system CJK serif
   on the web and risks tofu in the PDF — so warn to re-run `npm run gen:font`. */
{
  const glyphsRel = "assets/fonts/tsanger-glyphs.txt";
  if (!fs.existsSync(path.join(root, glyphsRel))) {
    warn(`${glyphsRel} missing — run \`npm run gen:font\` to build the Tsanger subset.`);
  } else {
    const covered = new Set(read(glyphsRel));
    const exts = new Set([".mdx", ".md", ".ts", ".tsx", ".json"]);
    const uncovered = new Set();
    for (const dir of ["content", "app", "components", "lib"]) {
      for (const rel of walk(dir)) {
        if (!exts.has(path.extname(rel))) continue;
        for (const ch of read(rel)) {
          // ASCII is always in the subset; only flag new non-ASCII glyphs.
          if (ch.codePointAt(0) > 0x7e && !covered.has(ch)) uncovered.add(ch);
        }
      }
    }
    if (uncovered.size) {
      warn(
        `Tsanger subset is stale: ${uncovered.size} glyph(s) used but not in ${glyphsRel} ` +
          `(e.g. ${[...uncovered].slice(0, 24).join("")}). Run \`npm run gen:font\` and commit the result.`,
      );
    }
  }
}

if (failures.length) {
  console.error(`Quality check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn(`Quality check warnings (${warnings.length}):`);
  for (const warning of warnings) console.warn(`- ${warning}`);
}

console.log("Quality check passed.");
