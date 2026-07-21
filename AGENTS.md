<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Kimi · 从长文本到一套 agent 栈 — Agent Brief

Editorial single-book ebook site — 《Kimi · 从长文本到一套 agent 栈》
by **Zhaphar**, at <https://kimi.read.wiki>. The site brand is **Kimi
Cookbook** (header logo + name); the book itself keeps its full title
for metadata / RSS / OG. One book about the Kimi agent stack, for
readers who already pay for Kimi but only use a fraction of it.
Slimmed down from a multi-book library: the architecture still
supports N books, the manifest just holds one (`lib/books.ts` →
`BOOKS = [kimi]`). The home page `/` is proxied to `/books/kimi` via a
`next.config.ts` rewrite — the book intro page IS the landing page.

**Stack**: Next.js 16 App Router (Turbopack) + React 19 + TypeScript
strict + Tailwind v4 + MDX (`next-mdx-remote/rsc`) + `next-themes` +
`fuse.js` + `@lobehub/icons` + Playwright (PDF). Hard rules below.

---

## 1 · v3.css is VERBATIM

`app/globals.css` is layered:

1. Tailwind import + `@theme` tokens (lines 1–34)
2. **Verbatim v3.css block** (lines ~38–2034) — DO NOT EDIT
3. Page-local `<style>` blocks (lines ~2289–2989) — also verbatim
4. **Round-N post-port blocks** (3–6 right now) — your territory

When you need to change v3 behavior, append a Round-N block at the
bottom of the file. Never edit the verbatim block — same-specificity
later rules win the cascade, but `:root[data-theme="light"]` vs
`:root` are different specificities, so override needs to match or
exceed the original selector specificity.

The verbatim part of v3.css is sometimes wrong by accident
(e.g. `:root` print override loses to `:root[data-theme="light"]` —
`--bg` stays warm even in @media print). When you hit this, fix it
in a Round-N override instead of editing verbatim.

---

## 2 · Async `params` Promise pattern (Next.js 16)

All route components have `params` typed as a **Promise**:

```ts
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  ...
}
```

Same for `generateMetadata`. Sync access (`params.slug` directly)
breaks at build time.

---

## 3 · `dynamicParams = false` + `generateStaticParams`

Every dynamic route exports both:

```ts
export const dynamicParams = false;
export function generateStaticParams() {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}
```

This is what makes drafts work: `getAllBooks()` filters out
`draft: true` books, so their routes never get generated, and any
direct URL 404s automatically (no need for manual `notFound()`
checks against drafts).

---

## 4 · Bilingual `<T>` component + `language` flag

```tsx
<T zh="中文文本" en="English text" />
```

Renders BOTH spans; v3.css's `[lang]` rules hide the inactive one
based on `<html data-lang>`. Stays a Server Component.

**`en` is optional** — when null / undefined / empty, the en slot
renders `zh` (fallback). So zh-only books still read correctly in
EN mode.

Same fallback in `<Kicker zh={...} en={...} />` — `en` optional.

**`BookMeta.language: "zh-en" | "zh"`** declares language mode:
- `"zh-en"` (default) — supply all English fields
- `"zh"` — `titleEn / descriptionEn / chapter.titleEn` filled with
  empty string `""`; `subtitleEn / ledeEn` omitted (optional fields).
  Book detail page shows "Chinese only" notice in EN mode.

---

## 5 · Draft system

Two-level via `draft: true`:

- **`BookMeta.draft`** — book completely hidden (library / home / RSS /
  search / OG / nextBook chain / routes). `getAllBooks()` filters at
  source, downstream needs no awareness.
- **`Chapter.draft`** — chapter stays in book TOC (with "DRAFT"
  pill), but URL renders `<DraftNotice>` placeholder instead of
  reading the MDX file. RSS + search skip it.

`getAllBooks` / `getBook` / `getPreviousBook` all filter drafts.
When the nextBook chain points into a draft slot, the recommendation
card just doesn't render — once draft is unflagged, chain auto-resumes.

---

## 6 · Cover branding

Single-book site: `lib/cover-brand.ts` holds exactly one entry
(`kimi`, ink accent `#1A1A1A`); a new book would add its own entry.

Logos come from `@lobehub/icons` via **narrow subpaths**:

```ts
import KimiColorLogo from "@lobehub/icons/es/Kimi/components/Color";
import KimiTextLogo from "@lobehub/icons/es/Kimi/components/Text";
```

Don't barrel-import — bundle bloats. `BookCoverLogo.tsx` is the only
place that imports them; the wrapper is a Server Component (since
icons are `"use client"` themselves, the boundary lives at the icon).
It renders just the Kimi lockup now: the white-K `Kimi/Color` inside
a `.book-cover-logo__tile` filled with `--cover-accent`, plus the
`Kimi/Text` wordmark (see §11 · combined-logo brand marks).

Thumbnail combined block width needs to land at ~100–115px (in a
124px usable thumb container). Per-brand overrides in `globals.css`
Round-5/Round-6 — Kimi's short wordmark gets bumped up there.

---

## 7 · Print color adjust (PDF gotcha)

Playwright `printBackground: true` covers the page bg, but
**nested element backgrounds get dropped** by Chromium unless
`print-color-adjust: exact` is explicitly set. We force it globally
inside `@media print`:

```css
@media print {
  *, *::before, *::after {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

Don't remove this — it's what keeps Kimi's black avatar tile, the
Warp cover symbol's teal gradient, callout fills, and code-block
tints all visible in the PDF.

Page is white in PDF (v3.css's verbatim `body { background: #FFFFFF
!important }`). Don't paint other content-area backgrounds in print
unless you also commit to going full-bleed (which requires killing
the `@page` margins and reimplementing the `counter(page) / counter
(pages)` footer outside @page margin boxes).

---

## 8 · MDX content conventions

Chapter MDX files use these v3 vocabulary components (from
`components/mdx/`):

- `<Cover />` — chapter title page (data closes over `chapter` /
  `number` from `getMdxComponents`)
- `<SectionTitle number="I">…</SectionTitle>`
- `<H3 id="...">…</H3>` (auto-id via rehype-slug for plain `###`)
- `<Divider />` — centered ". . ."
- `<Quote source="…" text="…" />`
- `<CodeBlock caption="…">…</CodeBlock>` (component-level; markdown
  fences also work but without caption)
- `<Tabs caption="…"><Tab label="…">…</Tab>…</Tabs>`
- `<Figure label="…" caption="…" ratio="16 / 9" src="…" alt="…" />`
- `<Callout kind="note|tip|warn" zh="…" en="…" />`
- `<Footnote n={1} />` + frontmatter `references: [{id, body, bodyEn,
  tip?, tipEn?, url?, urlLabel?}]`
- `<References />` (renders frontmatter `references` at chapter end)
- `<Kicker zh={…} en={…} sig="..." />` — closing manifesto

Chapter pages also mount a page-level `<ChapterOutline />` rail outside the
MDX body. It is extracted automatically from `<SectionTitle>`, `<H3>`, and
markdown `###` headings in `lib/chapter-outline.ts`; authors should not add a
manual TOC component in MDX.

Chapter cover title policy: `title / titleEn` are canonical full titles for
metadata, search, RSS, links, and long-form references. If a rare chapter title
is too long for the cover, set `coverTitle / coverTitleEn` in `meta.ts`; do not
shorten the canonical title or rely on forced three-line wraps.

For zh-only books, drop the `en` prop everywhere. Plain Chinese
paragraphs in MDX are fine; the `<T>` wrap is only for bilingual
content that needs to switch on language toggle.

---

## 9 · Static manifest, not fs scan

`lib/books.ts` exports `BOOKS` as an explicit array of imported
metas — keeps it client-component importable and keeps the routing
deterministic. Adding a book requires updating the array. Don't
replace with a dynamic `fs.readdirSync` scan.

---

## 10 · Testing + commit gates

Before any commit:

```bash
npm test          # quality-check.mjs — meta consistency, footnote refs, placeholder scan
npm run lint
npx tsc --noEmit
npm run build
```

`quality-check` should pass clean — single book with `nextBook`
unset, so the old nextBook-chain warnings are gone. Any failure must
be fixed before commit.

Commit messages: `<type>(<scope>): <subject>`, e.g.:

```
fix(covers): unify thumbnail size + drop synthetic italic on CJK titles
content(kimi): revise chapter 08 for the K2.7-Code rollout
feat(pdf): force print-color-adjust + hide per-chapter byline
```

Always trailer:

```
Co-authored-by: Moonshot Agent <307365324+moonshot-agent@users.noreply.github.com>
```

---

## 11 · Things that look like surface polish but aren't

- **CSS variable specificity**: `:root` vs `:root[data-theme="light"]`
  matters in print mode (v3.css print reset loses).
- **Lobehub icons are `"use client"`** internally — you can't
  truly server-side render them, but the wrapper can stay RSC.
- **next/og fonts**: `ImageResponse` doesn't auto-pick up
  `next/font/google`. Use `lib/og-fonts.ts`'s cached loader. Google
  serves WOFF2 to modern UAs which Satori rejects — the loader drops
  the UA header so the CSS endpoint returns TTF.
- **runtime fonts**: `app/layout.tsx` loads TsangerJinKai02 locally
  (`assets/fonts/*`) plus Inter / JetBrains Mono from `next/font/google`.
  Tsanger is the live `--serif` / `--text` stack for both Chinese and
  English. The old Playfair / Source Serif / Noto Serif stack remains only
  in the verbatim v3 block; Round-70 in `app/globals.css` owns the live
  composed `--serif`, `--text`, `--sans`, and `--mono` stacks.
- **row hover + title scale**: Round-71 in `app/globals.css` owns the
  Zhaphar-synced title sizing / wrapping and static book / library / TOC
  row hover. Do not reintroduce `translateX(4px)` row jumps; use an accent
  edge rail and title color for hover / focus state.
- **TOC rails**: Round-72 keeps TOC surfaces on their assigned side
  (website article TOC on the left; ebook chapter outline on the right)
  while sharing transparent hover, quiet panel borders, accent rail
  hover / active state, and 1.5px focus rings.
- **chapter outline state**: Round-73 mirrors the website TOC behavior for
  ebooks without moving it left: right-side marker rail by default, temporary
  hover / focus / `O` panel, and a persisted pin state via
  `kimi:chapter-outline=pinned`.
- **print book cover is upright**: the print cover title is now
  `.cover-art__title`, which is upright by default (`font-style: normal`).
  Round-78 (which uprighted the old `.print-cover__title` meta column) is
  retired — Direction A removed that column. Chapter covers stay upright via
  Round-77. Never reintroduce `font-style: italic` on a CJK display heading
  (synthesized italic over Chinese is forbidden by DESIGN §3).
- **"In This Book" popover overflow**: Round-79 right-anchors `.ch-toc`
  (`left: auto; right: 0`). Round-64 moved its trigger to the right of the
  ch-nav meta row, but the verbatim popover still centered on it
  (`left: 50%; translateX(-50%)`, 440px) — so it overflowed the right edge on
  chapter pages at ~900–1140px (`visibility: hidden`, not `display: none`, so
  it counts toward scrollWidth even closed). Smoke now guards chapter overflow
  at 1024px.
- **SSR-safe UI chrome strings**: the server always renders zh, but an EN
  reader's pre-paint script sets `data-lang=en`, so any `useLang()`-driven
  attribute (`aria-label` / `placeholder` / `alt`) hydration-mismatches and
  gets stranded on Chinese. Give chrome controls a **static bilingual**
  `aria-label` (`"中文 / English"`, like `ChapterOutline`), and gate visible
  language-specific text (search placeholders) on `search !== "closed"` or a
  mounted flag so it matches the server at hydration then localizes. Never
  reach for `suppressHydrationWarning` on an attribute — React keeps the server
  value and never patches it.
- **cover + detail intro (Round-80)**: the book cover and the detail-page H1
  render `coverTitle` / `coverTitleEn` (falling back to `title`), and the cover
  tagline + detail intro render the short `lede` (falling back to
  `subtitle` / `description`). The paragraph-length `subtitle` / `description`
  still ship in OG / RSS / search / `llms.md` — they just don't sprawl on the
  page. Long "Brand · descriptor" titles need a tight `coverTitle` (e.g.
  `Warp · A Terminal Meta-Tool`) to sit in 2 lines on the ~340px cover;
  Round-80 caps the cover title at 2 lines and shrinks the size. quality-check
  requires a `lede` on every non-draft book and warns when a title is too wide
  without a `coverTitle`; keep coverTitles under ~20 CJK-width units.
- **book detail hero (Round-82 → Round-83)**: the hero is now **two columns**
  (Round-83 supersedes Round-82's single column). LEFT: combined brand mark
  (`bookCoverMark`) → kicker → title (`coverTitle`, which still drops the
  redundant brand prefix since the mark carries it) → lede → a 3-item colophon
  (`.book-detail__stats`: 章节 / 更新 / 作者 — 时长 was dropped) → actions. RIGHT: a
  **cover card** (`.book-detail__aside` › `.cover-card`) — a flat, hard-edged
  panel (hairline, no radius/shadow) = a brand-logo strip over the
  flowing-gradient `<CoverVisual>` art, **no overlaid text**. Desktop: the card
  fills the column height (top aligns with the mark, bottom with the actions,
  via `align-items:stretch` + `flex:1` art). Phones (≤640): the card **floats
  top-right**, the title wraps beside it (`word-break:normal` + smaller size),
  and lede / colophon / actions `clear` full-width below. The card is **first in
  the DOM** (so it can float) and pinned to the right column on desktop via
  `grid-column`. Colophon stats + action buttons are **fixed-width** (sized to
  the wider EN labels) so zh / en don't reflow; the two secondary actions are
  bordered equal boxes. smoke asserts the 3-stat colophon + mark and no
  `.book-detail__cover`.
- **`<CoverVisual>` — the flowing-gradient cover art** (`components/CoverVisual.tsx`,
  `lib/cover-visual.ts`): a pure-SVG "terminal" wave card, vector + self-contained
  (so `print-color-adjust` just works). Every colour is a CSS var, so it themes
  per brand: defaults derive from `--cover-accent` via `color-mix`, and a brand
  overrides `--cv-bg` / `--cv-1..4` / `--cv-hi` inline. **Set the overrides on the
  `.cover-visual` element itself** (via CoverVisual's `style` prop) — the
  `.cover-visual {…}` CSS default sets those vars on the element too, so an
  inherited value from a parent loses; an inline value on the element wins.
  Kimi's near-ink accent (#1A1A1A) would derive a dull grey, so it ships an
  explicit palette instead: the `moon` variant — a 月之暗面 dark-side moon
  (a faint ghost disc plus one lit paper crescent on the limb) under a
  hairline orbit with a single satellite in Kimi blue (`lib/cover-visual.ts`
  holds the only brand entry).
- **cover card is a theme-stable "book jacket"**: the `.cover-card` (web hero
  right column + the print jacket) is a light strip over the dark `<CoverVisual>`
  art and does **not** invert in dark mode. So the strip stays light and the
  brand wordmark is pinned to dark ink (`--cover-combine-text-color: #1a1a1a`);
  a `var(--ink)`-accented brand would also need its `--cover-logo-color` pinned
  dark on the strip, or it would go white-on-white in dark mode. Kimi's
  tile-backed mark already shows fine.
- **combined-logo brand marks — the hand-rolled Kimi tile**: the book's
  `.book-cover-logo__combined` slot renders **icon + wordmark** so the
  detail mark, print cover, and thumbnails all read the same. **Kimi**'s
  brand mark is a white `K` on a black tile (exactly what `lobehub`'s
  `Kimi.Combine` / `Kimi/Avatar` render — but those need a numeric px
  `size` + `@lobehub/ui`'s runtime CSS, which this project doesn't
  load, so the literal component renders broken/stacked here). We compose the
  same lockup ourselves: `Kimi/Color` (white-K-on-transparent) inside a
  `.book-cover-logo__tile` filled with `--cover-accent`, sized by our
  `--cover-combine-*` vars so it scales across thumbnail / detail / print. **The
  tile fill needs `--cover-accent` set on the mark** — `CoverArt` sets it inline
  for thumbnail/print; `bookCoverMark` sets it for the detail mark. Miss it and
  the tile has no fill and looks washed out in light mode (that was the bug).
- **print cover is a full-bleed two-column "jacket"** (mirrors the web detail
  hero): `.print-cover__art` fills the A4 first page (`210mm × 297mm`) and
  `@page :first` drops the margins + page-counter footer (verbatim v3).
  `bookPrintCover` renders a bespoke `.print-jacket` (NOT the shared `.cover-art`
  anymore): a **masthead** (`.print-jacket__masthead`: imprint `KIMI` +
  serial `NO. NN`, the catalogue number from the book's position in
  `getAllBooks()`) over a top hairline; a **body** (`.print-jacket__body`, a
  `1fr 66mm` grid) = a text column (kicker → mark → title → accent rule → lede,
  vertically centered) and the flowing-gradient cover card (`.print-jacket__card`
  › `.cover-card` › `<CoverVisual>`) filling the column height; and a 3-part
  **colophon** (author / chapters·minutes / year) over a bottom hairline. All
  `.print-jacket*` styling is in `@media print` (the on-screen /print preview is
  intentionally rough — the PDF is the deliverable). quality-check asserts the
  full-bleed dims + `.print-jacket__masthead` + `.print-jacket__card`; smoke
  asserts the masthead + cover card + 3-part colophon render. Old dead rules
  (`.print-cover__art .cover-art*`, `.cover-art__masthead`) + the unused CoverArt
  `masthead` prop remain as harmless cruft — safe to prune.
- **printed TOC rows are clickable**: each `.print-toc__item` wraps its cells in
  a `.print-toc__link` (`href="#chapter-<slug>"`) and the grid/padding live on
  the link so the whole row is the hit target; each chapter `<article>` carries
  the matching `id="chapter-<slug>"`. Chromium's `page.pdf()` turns those
  same-document fragment links into GoTo/`/Dest` annotations, so the exported
  PDF's 目录 jumps to each chapter. smoke guards link↔anchor parity on
  `/books/kimi/print`.
- **PowerShell heredocs**: this is a Windows machine. PowerShell
  `@'…'@` heredoc is verbatim — `\n` stays literal `\n`, useful for
  writing JSX `{"text with\nnewline"}` content to MDX stubs.
- **Inner ASCII quotes inside Chinese strings break TS parsing** —
  use `「…」` instead of `"…"` for Chinese inner quotes inside
  meta.ts strings.
- **agent-readable markdown (llms surfaces)**: whole-book
  `/books/<slug>/llms.md` (~90 KB — TOC lines carry per-chapter md
  links, and a top-of-file note with the build-time size + completeness
  self-check) and per-chapter `/books/<slug>/<chapter>/llms.md` (the
  truncation fallback, 5–25 KB each). `/llms.txt` lists every chapter
  md; book + chapter pages carry `text/markdown` link alternates; the
  copy-prompt buttons (`AgentReaderButton` book level, `ChapterActions`
  chapter level) demand a completeness self-check so silently truncated
  agent fetches get reported instead of passed off as the whole book.
- **chapter share surfaces (Round-104)**: the reading-aids bar also
  carries 二维码 (QR popover — reuses `/api/mp/qr.png`, encodes the
  CANONICAL chapter URL from `lib/site`, never the preview origin) and
  海报 (`/books/<slug>/<chapter>/poster.png`, an `ImageResponse` route
  prerendered at build like the OG images). The poster serif is the
  LOCAL Tsanger subset TTF — next/og rejects WOFF2 and Google-hosted
  CJK families arrive as unicode-range shards, so `npm run gen:font`
  also emits `assets/fonts/*.poster.ttf` (sfnt) alongside the woff2
  subsets; regenerate after content edits. Satori quirks: multi-child
  divs need explicit `display:flex`, and an accent stop-dot must be
  glued to the title's last char with `whiteSpace:nowrap` or it wraps
  onto a line of its own.

---

## 12 · Files that explain themselves

If you're trying to do something this brief doesn't cover, look at
**[DESIGN.md](./DESIGN.md)** first — it documents **Zhaphar's Design
Language · v3** (*Editorial Reading*) end-to-end (colors, typography,
voice, components, print, OG, agent-readable md). Then the canonical
guide for that area is usually in the code:

- adding/changing books → existing meta.ts files under `content/books/*/`
- cover sizing rules → `app/globals.css` Round-5 / Round-6 blocks
- draft / language fallback → `lib/types.ts` + `components/T.tsx`
- chapter MDX vocabulary → `components/mdx/*.tsx`
- PDF quirks → `app/globals.css` Round-4 + `scripts/build-pdfs.mjs`
- routing model → any `app/books/[slug]/**/*.tsx` (all follow the
  same `dynamicParams = false` + `generateStaticParams` pattern)
- promo posters / video (小红书 assets) → `promo/README.md` — the
  distilled poster + video grammar, palette/typography/text
  disciplines, and the acceptance checklist

Read those before inventing a new pattern.
