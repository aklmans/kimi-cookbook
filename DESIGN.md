# Zhaphar's Design Language · v3 — Editorial Reading

A documentation file for any Agent (or human) that needs to keep
the Kimi Cookbook single-book site (kimi.read.wiki) visually +
editorially coherent, OR wants to reuse this design language in
another project.

This is *not* a brand book. It's a working reference: every value
is what currently ships, every rule is one that's been earned by a
specific judgment in the codebase. The language itself has a name —
**Zhaphar's Design Language · v3** — and it applies end-to-end: the
website, the printed PDF, the WeChat Mini Program, and the promo
posters all draw from the same tokens, hairlines, and moon mark.

---

## 1 · 设计原则

The v3 *Editorial Reading* design language has five non-negotiables.
If a change violates one of them it's wrong, no matter how
"reasonable" it looks.

1. **节制 (Restraint)** — the accent color appears only at the stop
   period after a sentence, at section number markers (—I, —II),
   in link underlines, and on hover/active states. Never as a
   background fill. Never as a "bar" or "tag chip". One or two
   accent moments per screen, never a wash.
2. **0.5px 是边界** (0.5px is the rule) — divider / border widths
   are only ever `0.5px`, `1px`, or `1.5px` (the last only for
   quote / code block left rules). No thicker borders, no shadows
   used as borders.
3. **正体标题，斜体点睛** (upright titles; italic for accents) — display
   headings and card titles are **upright** editorial serif (Round-42);
   italic is reserved for editorial accents only — the kicker manifesto,
   pull-quote text, and `<em>`. Italic on body / paragraph text is rejected,
   and CJK is never synthesized-italic (Round-51 uprights CJK in the
   lede / kicker; see "CJK synthesized italic is forbidden" below).
4. **印刷感优先** (print-style first) — generous whitespace, em-dash
   markers (— I), stop period (orange `.`), uppercase mono labels
   with `letter-spacing: 0.25em`. The site reads like a small press
   monograph, not a SaaS marketing page.
5. **双语并存** (bilingual coexistence) — every visible string ships
   both zh and en versions inside `<T>` spans; v3.css's `[lang]`
   rules hide the inactive one. Chinese is primary; English fades
   to fallback when omitted.

---

## 2 · 色彩

### Tokens (CSS custom properties on `:root`)

```
--bg          #FAFAFA  warm off-white page (light) / #1A1A1A (dark)
--ink         #1A1A1A  primary text (light) / #FAFAFA (dark)
--ink-2       #3A3A3A  secondary text (light) / #B8B8B8 (dark)
--ink-3       #6B6B6B  tertiary, labels, metadata (light) / #8A8A8A (dark)
--rule        #9A9A9A  divider 0.5px lines (light) / #4A4A4A (dark)
--border      #C0BFBA  card borders, subtle frames (light) / #3A3A3A (dark)
--accent      #1783FF  THE Kimi blue (light) / #5E9FFF (dark, brighter)
--code-bg     #F3F6F9  cool "blue-paper" code tint (light) / #242A32 cold slate (dark)
--row-hover   #F5F2EC  list row hover (light) / #232323 (dark)
```

### Accent rules

`--accent` is the single brand color. Use it **only for**:
- The stop period `<span class="stop">.</span>` after H1 / H2 / H3
- Section number prefix `— I`
- Link underline (`text-decoration-color`)
- Hover color on interactive elements
- The 1px rule on book covers
- Reference list ID badges

Never use it for: backgrounds, button fills, tag pills, focus rings,
selection states (selection uses `--bg` on `--accent` background,
not the other way).

### Theme switching

`<html data-theme="light|dark">` toggled by `next-themes`. All
color tokens flip via `:root[data-theme="..."]`. Never hardcode
hex colors in components — always reach for the token.

---

## 3 · 字体

3 runtime families are loaded through `next/font` and exposed as CSS
variables. TsangerJinKai02 is the primary editorial serif for Chinese,
English, Japanese, and Korean; the system publishing serif stack is only
a late fallback.

Tsanger loads `display: swap` + `preload: true`, with a metric-matched
local fallback face ("TsangerJinKai02 Fallback", Round-98: the reader's
system CJK serif pinned to Tsanger's vertical metrics) first in the
fallback list, so a cold first view paints immediately and swaps into
Tsanger without reflow (≈0.006 CLS, from Tsanger's proportional CJK
punctuation only). Don't move it back to `display: optional`: optional
never applies the font once it misses its ~100ms first-paint race, which
left every uncached visit stuck on the system serif until a refresh.

```
--font-tsanger     TsangerJinKai02 W04/W05  editorial body + headings
--font-inter       Inter                    sans (rarely used)
--font-jetbrains   JetBrains Mono           mono labels + code
```

### Composed stacks

```
--serif / --text: TsangerJinKai02, TsangerJinKai02 Fallback, Noto Serif SC, Songti SC, Charter, Georgia, serif
--sans:  Inter, system-ui, TsangerJinKai02, Noto Serif SC
--mono:  JetBrains Mono, SF Mono, Consolas, TsangerJinKai02, Noto Serif SC
```

### Use which stack where

| Slot | Stack | Style |
|---|---|---|
| Display H1 (cover title) | `--serif` | **upright** 500, screen clamp with zh/en max-width wrapping (Round-42, -46, -70, -71) |
| Section H2 | `--serif` | **upright** 500, clamp(1.72rem, 3vw, 2.18rem) (Round-42) |
| Body H3 | `--serif` | **upright** 600, clamp(1.22rem, 2vw, 1.42rem) (Round-42) |
| Body paragraph | `--text` | upright 400, 18px / 1.78 |
| Reading lede (cover, book detail) | `--text` | upright 400, 20px (Round-7, -41) |
| Display lede (home hero, featured) | `--serif` | italic 500 — CJK uprighted (Round-51) |
| Kicker manifesto, pull-quote | `--serif` | italic 500 — CJK uprighted (Round-51) |
| Mono label / eyebrow | `--mono` | 600, 11px, `letter-spacing: 0.25–0.3em`, uppercase |
| Code | `--mono` | 400, 14px |
| Chinese characters in CJK marks | `--serif` | upright 500 (was italic, broke synthesized italic on CJK) |

### CJK synthesized italic is forbidden

Chinese fonts have no real italic; CSS `font-style: italic` on CJK
glyphs produces a skewed render that looks dirty. Any rule that
sets italic on a slot containing Chinese must either be removed
or paired with `font-style: normal` for CJK content.

### Mono label rhythm

The "editorial uppercase mono label" pattern:

```css
font-family: var(--mono);
font-size: 11px;
font-weight: 600;
letter-spacing: 0.25em;
text-transform: uppercase;
color: var(--ink-3);
```

Used for: eyebrows ("— LATEST"), byline ("By Zhaphar · 10 Chapters"),
section heads, footer labels. Highly repeated — this is the
sound of the design language.

---

## 4 · 间距与排版

### Width tokens

```
--content-w        680px base → 840px on screen (Round-45); prose reading column
--reading-px       32px desktop / 24px mobile (left/right padding)
.featured          880px max-width
.books-list        880px
.book-detail       1080px (grid: 480px cover + 1fr meta)
```

### Vertical rhythm

- Body line-height: **1.78** (18px font, ample for editorial)
- Paragraph margin-bottom: **22px**
- H2 / H3 margins generous; lede with `text-wrap: pretty`, list/detail
  titles with `text-wrap: balance`
- Chapter cover titles use the full reading column and `text-wrap: pretty`.
  For the rare title that is still visually too long, set
  `coverTitle / coverTitleEn` in `meta.ts`; keep `title / titleEn` as the
  canonical full title for metadata, search, RSS, and links.
- Section breaks via `<Divider />` (centered ". . ." in accent color)

### Borders

```
0.5px solid var(--border)   default card / divider
0.5px solid var(--rule)     prose hr
1.5px solid var(--ink)      quote / code-block left rules (only place 1.5px allowed)
```

Never use `box-shadow` for visual definition. The design is
hairline + whitespace, not shadow + radius.

### Border radius

Default: **0**. The whole design language is hard-edged. Two
exceptions: the Kimi avatar tile (~22% of tile size, iOS-app-icon
look — Kimi's own brand mark) and the Giscus comment cards (subtle
radius, for visual match with GitHub's UI).

---

## 5 · 标点与编辑约定

These are conventions for any prose written for this site —
chapter MDX, descriptions, ledes, UI strings.

### Punctuation

- **Stop period as accent** — sentences in titles end with
  `<StopPunct />` (renders as orange `.`), not a plain period
- **Em-dash with spaces** — Chinese ` —— `, English ` — ` (single
  em-dash with one space each side)
- **Comma** — Chinese half-width `,` (with trailing space before
  next CJK char), not full-width `，`. Matches v3.css verbatim.
- **Inner quotes** — Chinese `「…」` not `"…"`. Reason: ASCII
  double quote inside double-quoted TS strings is a parser error;
  Chinese fullwidth corner brackets parse cleanly and look more
  editorial.
- **Section numbers** — Roman numerals (`I`, `II`, `III`) for
  on-page section markers, padded `01-09` for chapter numbers
  (`chapterNumber(i)` helper)

### Voice (for descriptions, ledes, titles)

The voice tested-and-accepted as "正经出版物" register:

✓ Declarative — "本书介绍 X 在 Y 里的位置和用法"
✓ Specific — name actual products / files / numbers
✓ Acknowledge tradeoffs honestly — "X 更稳, Y 更便宜"
✓ Short sentences, em-dash to subordinate clauses

✗ Marketing — "把 X 用足", "把 X 拆开", "彻底搞懂 X"
✗ Positioning words — 底层 / 实战 / 入门 / 必备 / 大全
✗ Hype — "革命性", "颠覆", "重新定义"
✗ "不是 X, 是 Y" framing — it's a posture, not information

### Title pattern

`<Brand or topic> · <descriptive secondary>`
- "Anthropic · 一份会员的全部产品"
- "Cursor · 编辑器之外"
- "Hermes · Nous Research 的工具调用微调系列"

Workflow / category books can drop the colon and use just the
category name: "知识工作流", "开发者工作流".

### Chapter title pattern

`<topic> · <action verb the reader walks away with>`
- "Git + GitHub · clone / commit / push 三步走通"
- "编辑器 · 装 Cursor + 试一次 Tab 与 Cmd+K"
- "MCP / Skill / ACP · 接通你的第一个 MCP server"

Every chapter title should hint at a tangible skill the reader
gets from it. Pure concept titles are reserved for intros / closings.

---

## 6 · 组件词汇

MDX component map (lives in `components/mdx/`). Use these instead
of plain markdown / divs whenever possible.

| Component | When to use |
|---|---|
| `<Cover />` | Chapter title page. Data closes over `chapter` + `number`. |
| `<SectionTitle number="I">…</SectionTitle>` | Top-level section in a chapter |
| `<H3 id="...">…</H3>` | Subsection; markdown `###` also works (auto-id via rehype-slug) |
| `<Divider />` | Centered ". . ." between mental sections |
| `<Quote source="…" text="…" />` | Pull quote — body in `text` prop, NOT children (MDX paragraph wrap clash) |
| `<CodeBlock caption="…">…</CodeBlock>` | Captioned code; plain ``` `` ``` works without caption |
| `<Tabs caption="…"><Tab label="…">…</Tab>…</Tabs>` | Tabbed code samples |
| `<Figure label="…" caption="…" ratio="16 / 9" src="…" alt="…" />` | Image w/ caption; falls back to placeholder if no src |
| `<Callout kind="note\|tip\|warn" zh="…" en="…" />` | Inline editorial aside; props NOT children |
| `<Footnote n={1} />` | Inline footnote marker; tip + back-ref auto-wired |
| `<References />` | Renders frontmatter `references` as end-of-chapter list |
| `<Kicker zh={…} en={…} sig="…" />` | Closing manifesto (multi-line, `\n` for line break) |
| `<DraftNotice />` | Rendered when chapter has `draft: true` |
| `<T zh="…" en="…" />` | Bilingual text wrapper; `en` optional (falls back to zh) |
| `<StopPunct />` | The orange period |

### Why some props use `text=` / `zh=` / `en=` instead of children

MDX wraps loose children in `<p>` tags, which then nest inside the
component's own paragraph element → invalid HTML. Quote / Callout
/ Kicker explicitly take their body via prop to sidestep this.
CodeBlock and Tabs use children because they accept code (no `<p>`
wrap risk).

---

## 7 · 封面系统

A book cover is one of three things, in priority order:

1. **Real image** at `public/books/<slug>/cover.*` — preferred when
   the author / publisher has one
2. **Lobehub icon mark** — for books anchored to a known product
   brand (Anthropic, OpenAI, Cursor, Gemini, Kimi, Doubao, Qwen,
   OpenCode, HermesAgent, OpenClaw). Pull via narrow subpath:
   `@lobehub/icons/es/<Brand>/components/{Mono|Color|Text}`
3. **Typographic mark** — for books without a single product brand
   (workflows + primer). One CJK character + one English mono code:
   - `knowledge-work`: 知 · KNOWLEDGE
   - `developer-work`: 码 · DEVELOPER
   - `creator-work`: 媒 · CREATOR
   - `study-work`: 学 · STUDY
   - `primer`: 基 · PRIMER

### Per-brand metadata

`lib/cover-brand.ts` maps slug → `{label, mark, accent, hasLobeIcon}`.
`accent` is the brand's signature color (used for the cover's 1px
rule, OG image, and book-specific UI accents).

### Thumbnail combined block width

In library / home thumbnails, the combined slot is `icon + gap + wordmark`.
Target width is **100–115px** to fit comfortably in the 124px usable
thumb container. Per-brand tuning lives in `app/globals.css` Round-5/
Round-6 blocks. Tune via `--cover-combine-icon-size` and
`--cover-combine-text-size`. Three patterns:

- **Long wordmark** (Anthropic, OpenCode, OpenClaw, Cursor): shrink both
- **Short wordmark** (Kimi, Hermes, Study): bump text size
- **Average wordmark** (OpenAI, Gemini, Doubao, Tongyi): use defaults

### Kimi and Warp are the two hand-rolled marks

Both need custom handling so their combined slot still reads
`icon + wordmark` like every other brand:

- **Kimi** — the brand mark is a white `K` on a black tile (this is what
  lobehub's `Kimi.Combine` / `Kimi/Avatar` render too; `Kimi/Color`
  alone is white-on-transparent and vanishes on light surfaces). The
  literal `Kimi.Combine` can't be used here — it needs a numeric px
  `size` and `@lobehub/ui`'s runtime CSS (which this project doesn't
  load), so it renders broken/stacked. Instead we compose the same
  lockup: `Kimi/Color` inside a `.book-cover-logo__tile` filled with
  `--cover-accent`, sized by our `--cover-combine-*` vars. Every context
  that shows the mark must set `--cover-accent` (`CoverArt` does inline;
  `bookCoverMark` does for the detail mark) or the tile has no fill.
- **Warp** — ships a symbol-only SVG (no lobehub Text logo), so its
  combined slot pairs the symbol with a typographic `WARP` workmark.
  The symbol is sized off `--cover-logo-size`, so every context that
  shows the combined mark must set it (see AGENTS.md §11).

---

### Cover title + tagline (and the detail intro)

A cover reads like a book cover — a title in ~2 lines plus a one-line
tagline, not a wall of text. The cover and the detail-page H1 render
`coverTitle` / `coverTitleEn` (falling back to `title`); the cover tagline and
the detail-page intro render the short `lede` (falling back to
`subtitle` / `description`). The full `description` / `subtitle` still feed
OG, RSS, search, and `llms.md` — they just don't sprawl on the page.

Because the "Brand · descriptor" titles are long, most books carry a tight
`coverTitle` (e.g. `Warp · A Terminal Meta-Tool`) that fits 2 lines on the
~340px cover; the canonical `title` stays full for metadata / search / links.
Round-80 caps the cover title at 2 lines and shrinks its size. quality-check
requires a `lede` on every non-draft book and warns when a title is too wide
without a `coverTitle` — keep coverTitles under ~20 CJK-width units.

On the **detail page** the cover and the meta column used to repeat each
other — both showed the kicker, title, and lede. The hero is now a single
title-page column (Round-82): a combined **brand logo** (icon + wordmark,
`bookCoverMark`, left-aligned; flat, no framed tile), then the text once
(kicker → title → lede), a hairline, an editorial colophon
(`章节 / 时长 / 更新 / 作者`, mirroring the About page's label/value block), and
the actions — no separate cover panel. Because the logo's wordmark carries the
brand, the display title (`coverTitle`) drops the redundant product prefix
(`Anthropic · 该用的那部分` → `该用的那部分`); the canonical `title` keeps it for
metadata / search. The full cover artwork still renders on the library / home
thumbnails and the print cover, where the cover is the label.

---

## 8 · 国际化 (i18n)

### `<T>` component

```tsx
<T zh="中文" en="English" />
```

Renders both spans. v3.css `[lang]` rules hide the inactive one
based on `<html data-lang>`. `en` is optional — when null /
undefined / empty, the en slot renders the zh content (fallback for
zh-only books).

### `BookMeta.language: "zh-en" | "zh"`

- `"zh-en"` (default): all English fields filled
- `"zh"`: zh-only book. English fields can be empty string `""` or
  omitted (for optional fields). Library row shows "中" badge.
  Book detail page shows a "Chinese only" note when reader is in EN
  mode (handled via `[lang="en"]` CSS visibility).

### CoverArt subtitle suppression

When `titleEn === ""` or `titleEn === title`, the italic English
subtitle on the cover doesn't render (avoids double-printing the
same Chinese title). Implementation: in `CoverArt.tsx`.

### SSR-safe UI chrome strings

Visible text switches language through `<T>` (both spans render; CSS
`[lang]` hides one), so it never hydration-mismatches. But **attributes**
can't dual-render. The server always renders zh; an EN reader's pre-paint
script sets `data-lang=en`, so a `useLang()`-driven `aria-label` /
`placeholder` / `alt` differs between server and client hydration — React
keeps the server (Chinese) value and never patches it, stranding EN readers.

- **aria-label / alt** → static bilingual string (`"中文 / English"`), the
  pattern `ChapterOutline` uses. Correct in both modes, no mismatch.
- **visible placeholders** → render the zh default at hydration (matching the
  server) and localize only after the panel opens (`search !== "closed"`) or
  after mount, so React reconciles the change instead of freezing it.
- Never `suppressHydrationWarning` an attribute to hide this — it silences the
  warning but leaves the wrong value in the DOM.

---

## 9 · 草稿系统

Two flags, both opt-in:

### `BookMeta.draft = true`

Book completely hidden from library, home, RSS, search, OG, and the
`nextBook` chain. `dynamicParams = false` + `generateStaticParams`
over `getAllBooks()` (which filters drafts) means draft routes
aren't even built — any direct URL 404s.

### `Chapter.draft = true`

Chapter stays in the book TOC (with a "DRAFT" pill in the read-time
slot, title fades to ink-3), but the chapter URL renders
`<DraftNotice />` instead of compiling the MDX body. The body file
on disk may or may not exist; renderer doesn't read it when draft.
Print PDF and RSS skip drafts too.

---

## 10 · 交互

### Keyboard shortcuts (delegated via `GlobalUI.tsx`)

| Key | Action |
|---|---|
| ⌘K / / | Search palette open / close |
| ↑↓ + Enter | Navigate + open results |
| Esc | Close overlays / fullscreen |
| ← → | Previous / next chapter |
| Home / End | First / last chapter |
| T | Toggle theme |
| L | Toggle language |
| F | Toggle fullscreen |
| H | Toggle chrome (hide UI) |
| ? | Show shortcut help |

### Transitions

- Default: `200ms ease`
- Color transitions: `120ms ease`
- Book / library / TOC rows stay fixed on hover; an accent rail at the
  surface edge plus title color carries the state (Round-71)
- TOC surfaces keep their assigned side while sharing the same interaction:
  transparent hover, quiet panel borders, accent rail for hover / active,
  and 1.5px focus rings (Round-72)
- Chapter outlines use the website TOC behavior on the right side: marker
  rail by default, hover / focus / `O` for temporary panel, pin for persistent
  panel, and close only dismisses the panel, not the rail (Round-73)
- Hover scale(1.02) on featured book cover
- Page-fade-out on chapter navigation (150ms via `.is-fading` class)

### Reading state

- Top scroll progress bar (1px, accent) updates on scroll
- Position persisted in localStorage per chapter URL, restored on
  return (only when between 10–98% of the way through)
- Theme + language preference also persisted

---

## 11 · PDF / 印刷

### `@page` (owned by v3.css verbatim)

```
size: A4;
margin: 22mm 20mm 24mm 20mm;
@bottom-left:  counter(page) " / " counter(pages)   [mono 9pt, ink-3]
@bottom-right: "KIMI"                                 [mono 9pt, ink-3 — Round-99 overrides the verbatim "AKLMAN"]
```

### Print stylesheet rules

- Hide chrome: header, footer, progress, ch-nav, discussion,
  copy buttons, theme/lang toggles
- Reflow to single column, `max-width: none`
- Each chapter cover, section, kicker → `page-break-before: always`
- Quote / code / figure → `page-break-inside: avoid`
- Body: 11.5pt, 1.7 line-height
- Chapter cover titles in generated PDFs use the current editorial title
  system: upright Tsanger, full text measure, and 24pt scale. Long chapter
  titles should use `coverTitle / coverTitleEn`, not forced multi-line wraps.
- The book front-matter cover title + subtitle (`.print-cover__title` /
  `.print-cover__subtitle`) are **upright** too (Round-78). They are display
  headings, so italic is wrong per §3 — and over Chinese it would be a
  synthesized skewed italic. Don't reintroduce `font-style: italic` here.
- Page background stays white (don't paint warm content; would
  conflict with white printer margins)
- **Cover page is a full-bleed two-column "jacket"** — `.print-cover__art`
  fills the whole A4 first page (`210mm × 297mm`) and `@page :first` drops the
  margins + page-counter footer. `bookPrintCover` renders a bespoke
  `.print-jacket` that mirrors the web detail hero: a **masthead** (imprint
  `KIMI` + catalogue serial `NO. NN`) over a top hairline; a body split
  into a text column (kicker → mark → `coverTitle` → accent rule → `lede`,
  vertically centered) and the flowing-gradient cover card (`<CoverVisual>`)
  filling the column height; and a 3-part **colophon** (author / chapters·minutes
  / year) over a bottom hairline. All `.print-jacket*` styling lives in
  `@media print`. Per-brand palettes + the theme-stable card behave exactly as
  on the web (see §7).
- **The printed 目录 is clickable** — each TOC row is a
  `.print-toc__link` (`href="#chapter-<slug>"`) and each chapter
  `<article>` carries the matching `id`. Chromium's `page.pdf()` turns the
  fragment links into GoTo annotations, so the exported PDF jumps to the
  chapter. smoke guards the link↔anchor parity.

### Two PDF dropping gotchas

1. **`print-color-adjust: exact` is mandatory** for nested-element
   backgrounds (Kimi tile, cool code-bg tint, callout fills, the Warp cover
   symbol's gradient). Set globally inside `@media print`. Playwright
   `printBackground:true` only covers the page bg, not nested elements.
2. **Per-chapter byline hidden in print** — `.v3-cover__byline`
   `display: none` in print. A printed book doesn't need a per-
   chapter "5 min read" stamp; book-level read time + total page
   count already live in the front matter and footer.

---

## 12 · OG / 分享图

`app/{,books/[slug]/,books/[slug]/[chapter]/}opengraph-image.tsx`
each generate a 1200×630 PNG via `next/og`'s `ImageResponse`.

### Fonts

Real fonts loaded at build time via `lib/og-fonts.ts` (cached
fetch from Google Fonts). OG typography is still a separate legacy
surface and has not yet been rethemed to the Round-70 runtime stack:
- Playfair Display italic 500 (italic display titles)
- JetBrains Mono 600 (uppercase mono labels)

CJK falls back to runtime default (no good way to load Noto Serif
SC under the size budget). Acceptable trade-off.

### Brand badge

Book / chapter OG images include a square brand block on the left
showing the book's `mark` (e.g. "AN" for Anthropic) in the brand
accent color, with the brand `label` below in mono. Matches the
typographic identity of the library.

---

## 13 · MD routes for AI agents (`llms.md`)

Branded markdown export for any AI reader, at two granularities:

- **Whole book** — `/books/<slug>/llms.md` (~90 KB). Structure:
  1. **Provenance header** — author, first-published date, language,
     canonical URL, license note
  2. **Agent fetch note** — total size (real KB count patched in at
     build time), per-chapter fallback pointer, and the completeness
     self-check (N chapters + the signed last line)
  3. **Subtitle + byline + description**
  4. **Table of contents** — every line links the chapter's own md +
     web URLs, so even a truncated fetch yields every chapter address
     (no slug guessing)
  5. **Each chapter** as `## 第 N 章 · 标题`, with `[原文](...)` +
     `[评论](#discussion)` + `[本章 md](...)` links, lede as
     blockquote, lightly cleaned MDX body, references appended
  6. **Engagement footer** — comments URL, Twitter / GitHub / email,
     support link, brand signature with license tag (the signature
     line doubles as the completeness sentinel)
- **Per chapter** — `/books/<slug>/<chapter>/llms.md` (5–25 KB each):
  compact provenance header, lede, cleaned body, references, prev /
  next / whole-book links. The fallback for agents whose fetch budget
  truncates the whole-book file.

Discovery: site-level `/llms.txt` enumerates every book AND every
chapter's md URL; book + chapter HTML pages advertise their markdown
twins via `<link rel="alternate" type="text/markdown">`. The "Feed to
AI" prompts (book-level `AgentReaderButton`, chapter-level
`ChapterActions`) state the expected size and demand a completeness
self-check, so a silently truncated fetch gets reported instead of
passed off as the whole book.

Every scraped copy carries its way home. License: CC BY-NC-ND 4.0
(book content) / all-rights-reserved (source code).

---

## 14 · Style System Hardening Checklist

This is the final guardrail layer after a style sync. Use it before
calling a visual pass finished, and keep it small enough that it can
actually be run.

### Visual regression surfaces

Always inspect the same representative surfaces after typography,
layout, language, print, or interaction changes:

- Home, library, search, about, and license pages.
- One zh chapter, one en chapter, and one long-code chapter.
- A long chapter outline with the marker rail, hover panel, pinned panel,
  keyboard focus, and mobile overlay.
- A book detail page in zh and en language modes.
- `/books/<slug>/print?lang=zh` and `/books/<slug>/print?lang=en` for at
  least one bilingual book.
- Generated PDFs for one zh-only book and one zh-en book.
- Mobile 390px viewport for library rows, chapter title wrapping, outline
  overlay, shortcut help, and footer rhythm.

### PDF / print contract

- Bilingual books produce two files: `<slug>.pdf` for zh and
  `<slug>.en.pdf` for en. Chinese-only books produce only `<slug>.pdf`.
- The print route must accept `?lang=zh|en` and set `data-lang` before
  paint so Chromium exports the requested language, not the browser's
  stored preference.
- Any content or typography change that affects print requires rerunning
  `PDF_BASE_URL=<server> npm run pdf`. Ignored PDF files are local output;
  only force-add them when the release process explicitly needs static
  PDF artifacts in git.

### Language and content integrity

- `language: "zh-en"` means top-level `titleEn / descriptionEn` and every
  non-draft chapter `titleEn` must be non-empty. When `lede` exists, the
  matching `ledeEn` should exist too.
- `language: "zh"` may leave English fields empty; the UI should show a
  clear Chinese-only note in EN mode rather than blanking content.
- PDF download links must follow the current UI language and never point
  EN readers at the zh static PDF.

### Interaction and accessibility pass

- Keyboard shortcuts should no-op inside text inputs and owned widgets.
- `Esc` closes overlays without losing persistent pinned state.
- Focus rings remain visible on chapter outline links, outline toggles,
  tabs, PDF/download buttons, search results, and shortcut help controls.
- Hover states stay static: no row jump, no cover/link layout shift, no
  accidental scroll-width growth on mobile.

### Scope discipline

- Do not add new template families, diagram systems, or component previews
  during hardening. Only lock down behavior that real pages already use.
- New visual rules must land with a doc note and either a quality-check
  assertion or a smoke-test route when the behavior is interactive.

---

## 15 · 复用到其它项目

This design language is portable. Some things are project-specific,
most are not.

### Portable (any editorial site)

- All design principles (§1)
- Color token model + theme switching pattern (§2) — re-pick the
  accent color per brand, keep the rest
- Typography stack + voice rules (§3, §5)
- Width / spacing / border discipline (§4)
- Component vocabulary (§6) — `<T>`, `<SectionTitle>`, `<Quote>`,
  `<Callout>`, `<Kicker>` all generalize beyond books
- Cover treatment system (§7) including brand-mapped typographic
  fallback
- Bilingual fallback pattern (§8)
- Draft system (§9) — generalizes to any content collection
- Keyboard shortcut set (§10)
- Print + OG conventions (§11, §12)
- Branded llms.md export (§13) — any docs site / blog should ship one

### Kimi book site specific

- The single Kimi brand entry in `lib/cover-brand.ts` (ink accent, the
  white-K-on-black-tile lockup in `components/BookCoverLogo.tsx`)
- Routes specific to "book" as the primary content unit
- Giscus comment integration (any chapter-keyed identity works for
  other use cases)

### Migration checklist for a new project

1. Copy v3.css verbatim from `app/globals.css` (lines 38–2034)
2. Copy the Tailwind `@theme` token wiring at top
3. Pick your accent color + repoint `--accent` (light + dark)
4. Replicate the `next/font` font loader in `app/layout.tsx` and
   the Round-70 font stack override in `app/globals.css`
5. Bring `<T>`, `<ThemeProvider>`, `<LangProvider>`, `<GlobalUI>`
   (or subset) over from `components/`
6. Bring MDX components you'll need from `components/mdx/`
7. Decide what your "book" equivalent is (post, project, doc) and
   model `meta.ts` similarly
8. Add Round-N blocks for any project-specific CSS overrides
   (always at end of globals.css, never edit v3.css verbatim)

---

*This file documents the design language as of the current build.
When a future change moves the goalposts (a new component, a new
typographic slot, a new editorial rule), update this file in the
same commit. Otherwise the file rots and the language drifts.*

