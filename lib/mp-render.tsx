import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import rehypeCodeTitle from "@/lib/rehype-code-title";
import { ZHAPHAR_CODE_THEMES } from "@/lib/code-theme";
import { chapterModifiedAt, chapterPublishedAt } from "@/lib/book-dates";
import { chapterNumber } from "@/lib/books";
import { extractChapterOutline } from "@/lib/chapter-outline";
import { absoluteUrl } from "@/lib/site";
import type { BookMeta, Chapter } from "@/lib/types";
import type { Reference } from "@/components/mdx";

/* ────────────────────────────────────────────────────────────────────
   Mini Program renderer — MDX → a restricted HTML subset consumed by
   the WeChat Mini Program's mp-html component.

   The web reader renders the full v3 vocabulary as React components;
   a Mini Program has no DOM, so this parallel component map degrades
   every v3 component to simple, flat HTML (h1-h4 / p / blockquote /
   figure / table / dl / ol / ul / pre / code / span / sup / a). The
   Mini Program styles structure via mp-html's `tag-style` map, so the
   markup here stays class-light; the few accent moments (section
   number, stop period, footnote, code title) carry the Kimi blue as
   inline styles because component-isolated WXSS can't reach inside
   mp-html and CSS vars don't exist there.

   The rehype chain mirrors the web chapter route (pretty-code with
   the cool Kimi palette, code titles, heading ids) minus the
   autolink self-anchors, which a Mini Program can't navigate.
   ──────────────────────────────────────────────────────────────────── */

const ACCENT = "#1783FF";

/** Flatten a ReactNode to visible text (zh side preferred for <T>). */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) {
    const props = node.props as { zh?: ReactNode; children?: ReactNode };
    if (props.zh !== undefined) return textOf(props.zh);
    return textOf(props.children);
  }
  return "";
}

function childElements<T>(children: ReactNode): ReactElement<T>[] {
  return Children.toArray(children).filter(isValidElement) as ReactElement<T>[];
}

/** zh side of a bilingual prop pair, with en as the fallback. */
function zhOf({ zh, en }: { zh?: ReactNode; en?: ReactNode }): ReactNode {
  return zh ?? en ?? "";
}

/* ── The MP component map (mirrors getMdxComponents' keys) ── */

function MpT({ zh, en }: { zh?: ReactNode; en?: ReactNode }) {
  return <>{zhOf({ zh, en })}</>;
}

function MpStopPunct() {
  return <span style={{ color: ACCENT }}>.</span>;
}

function MpCover({
  book,
  chapter,
  index,
}: {
  book: BookMeta;
  chapter: Chapter;
  index: number;
}) {
  const number = chapterNumber(index);
  const published = chapterPublishedAt(book, chapter, index);
  const modified = chapterModifiedAt(book, chapter);
  return (
    <div>
      <p>
        <small>
          {number} · 第{["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][index] ?? index + 1}章
        </small>
      </p>
      <h1>
        {chapter.coverTitle ?? chapter.title}
        <span style={{ color: ACCENT }}>.</span>
      </h1>
      {chapter.lede ? <p>
        <em>{chapter.lede}</em>
      </p> : null}
      <p>
        <small>
          {chapter.readTime} · 初稿 {published.slice(0, 7).replace("-", ".")}
          {modified !== published
            ? ` · 修订 ${modified.slice(0, 7).replace("-", ".")}`
            : ""}
        </small>
      </p>
      <hr />
    </div>
  );
}

function MpSectionTitle({
  id,
  number,
  children,
}: {
  id?: string;
  number?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <h2 id={id}>
      {number ? <span style={{ color: ACCENT }}>— {number} </span> : null}
      {children}
      <span style={{ color: ACCENT }}>.</span>
    </h2>
  );
}

function MpH3({ id, children }: { id?: string; children?: ReactNode }) {
  return (
    <h3 id={id}>
      {children}
      <span style={{ color: ACCENT }}>.</span>
    </h3>
  );
}

function MpDivider() {
  return (
    <p style={{ textAlign: "center" }}>
      <span style={{ color: ACCENT }}>. . .</span>
    </p>
  );
}

function MpKicker({ zh, en, sig }: { zh?: string; en?: string; sig?: string }) {
  const text = zh ?? en ?? "";
  return (
    <div style={{ textAlign: "center" }}>
      {text.split("\n").map((line, i) => (
        <p key={i} style={{ textAlign: "center", margin: 0 }}>
          <strong>{line}</strong>
        </p>
      ))}
      {sig ? (
        <p style={{ textAlign: "center" }}>
          <small>{sig}</small>
        </p>
      ) : null}
    </div>
  );
}

function MpQuote({
  source,
  text,
  children,
}: {
  source?: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <figure>
      <blockquote>
        <p>{text ?? children}</p>
      </blockquote>
      {source ? <figcaption>— {source}</figcaption> : null}
    </figure>
  );
}

function MpCodeBlock({
  caption,
  filename,
  language,
  children,
}: {
  caption?: ReactNode;
  filename?: ReactNode;
  language?: string;
  children: ReactNode;
}) {
  const title = filename ? (
    <p>
      <small>
        <strong>{filename}</strong>
      </small>
    </p>
  ) : null;
  const cap = caption ? (
    <p>
      <small>{caption}</small>
    </p>
  ) : null;
  const wrapsFence = Children.toArray(children).some(isValidElement);
  if (wrapsFence) {
    // The fence child already carries Shiki highlighting via rehype-pretty-code.
    return (
      <div>
        {title}
        {children}
        {cap}
      </div>
    );
  }
  return (
    <div>
      {title}
      <pre>
        <code data-language={language}>{children}</code>
      </pre>
      {cap}
    </div>
  );
}

type MpTabProps = { label: ReactNode; children: ReactNode };
function MpTab(props: MpTabProps): null {
  void props;
  return null;
}

function MpTabs({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  const tabs = childElements<MpTabProps>(children);
  return (
    <div>
      {tabs.map((t, i) => (
        <div key={i}>
          <p>
            <small>
              <strong>{textOf(t.props.label) || `Tab ${i + 1}`}</strong>
            </small>
          </p>
          {t.props.children}
        </div>
      ))}
      {caption ? (
        <p>
          <small>{caption}</small>
        </p>
      ) : null}
    </div>
  );
}

function MpFigure({
  label,
  caption,
  src,
  alt,
}: {
  label?: ReactNode;
  caption?: ReactNode;
  ratio?: string;
  src?: string;
  alt?: string;
}) {
  if (src) {
    return (
      <figure>
        {/* plain <img> by design: this markup is a string payload for the
            Mini Program's mp-html, never rendered by the browser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={absoluteUrl(src)} alt={alt ?? textOf(caption) ?? "配图"} />
        <figcaption>{caption ?? label}</figcaption>
      </figure>
    );
  }
  return (
    <blockquote>
      <p>
        <small>配图「{textOf(label) || "示意图"}」见网页版 kimi.read.wiki。</small>
      </p>
    </blockquote>
  );
}

function MpDiagramNote({ caption }: { caption?: ReactNode }) {
  return (
    <blockquote>
      <p>
        <small>
          示意图{textOf(caption) ? `「${textOf(caption)}」` : ""}见网页版
          kimi.read.wiki。
        </small>
      </p>
    </blockquote>
  );
}

type MpStatProps = {
  value: ReactNode;
  label: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
};
function MpStat(props: MpStatProps): null {
  void props;
  return null;
}

function MpStats({
  caption,
  children,
}: {
  cols?: number;
  caption?: ReactNode;
  children: ReactNode;
}) {
  const items = childElements<MpStatProps>(children);
  return (
    <div>
      <dl>
        {items.map((it, i) => (
          <div key={i}>
            <dd>
              <strong>
                {it.props.value}
                {it.props.unit ? <small> {it.props.unit}</small> : null}
              </strong>
            </dd>
            <dt>
              <small>
                {it.props.label}
                {it.props.sub ? ` · ${textOf(it.props.sub)}` : ""}
              </small>
            </dt>
          </div>
        ))}
      </dl>
      {caption ? (
        <p>
          <small>{caption}</small>
        </p>
      ) : null}
    </div>
  );
}

type MpPriceProps = {
  model: ReactNode;
  note?: ReactNode;
  input?: ReactNode;
  cached?: ReactNode;
  output?: ReactNode;
  context?: ReactNode;
  highlight?: boolean;
};
function MpPrice(props: MpPriceProps): null {
  void props;
  return null;
}

function MpPriceTable({
  label,
  asOf,
  unit,
  caption,
  children,
}: {
  label?: ReactNode;
  asOf?: string;
  unit?: ReactNode;
  caption?: ReactNode;
  children: ReactNode;
}) {
  const rows = childElements<MpPriceProps>(children);
  return (
    <div>
      <p>
        <small>
          <strong>{textOf(label) || "模型定价"}</strong>
          {asOf ? ` · 截至 ${asOf}` : ""}
        </small>
      </p>
      <table>
        <thead>
          <tr>
            <th>模型</th>
            <th>输入</th>
            <th>缓存命中</th>
            <th>输出</th>
            <th>上下文</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <code>{r.props.model}</code>
                {r.props.note ? <small> {r.props.note}</small> : null}
              </td>
              <td>{r.props.input ?? "—"}</td>
              <td>{r.props.cached ?? "—"}</td>
              <td>{r.props.output ?? "—"}</td>
              <td>{r.props.context ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {unit || caption ? (
        <p>
          <small>
            {unit}
            {unit && caption ? " · " : ""}
            {caption}
          </small>
        </p>
      ) : null}
    </div>
  );
}

type MpMilestoneProps = {
  date?: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  current?: boolean;
};
function MpMilestone(props: MpMilestoneProps): null {
  void props;
  return null;
}

function MpTimeline({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  const events = childElements<MpMilestoneProps>(children);
  return (
    <div>
      <ol>
        {events.map((e, i) => (
          <li key={i}>
            {e.props.date ? <small>{e.props.date} </small> : null}
            <strong>{e.props.label}</strong>
            {e.props.note ? <small> · {e.props.note}</small> : null}
          </li>
        ))}
      </ol>
      {caption ? (
        <p>
          <small>{caption}</small>
        </p>
      ) : null}
    </div>
  );
}

type MpCellProps = {
  label?: ReactNode;
  highlight?: boolean;
  children?: ReactNode;
};
function MpCell(props: MpCellProps): null {
  void props;
  return null;
}

function MpQuadrant({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  const cells = childElements<MpCellProps>(children);
  return (
    <figure>
      {cells.map((c, i) => (
        <div key={i}>
          {c.props.label ? (
            <p>
              <strong>{c.props.label}</strong>
            </p>
          ) : null}
          {c.props.children}
        </div>
      ))}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

type MpBarProps = {
  label: ReactNode;
  value: string | number;
  note?: ReactNode;
  accent?: boolean;
};
function MpBar(props: MpBarProps): null {
  void props;
  return null;
}

function MpBarCompare({
  unit,
  caption,
  max,
  children,
}: {
  unit?: ReactNode;
  caption?: ReactNode;
  max?: number;
  children: ReactNode;
}) {
  const bars = childElements<MpBarProps>(children);
  const peak =
    max ?? Math.max(0, ...bars.map((b) => Number(b.props.value) || 0));
  return (
    <div>
      {bars.map((b, i) => {
        const v = Number(b.props.value);
        const safe = Number.isFinite(v) ? Math.max(0, v) : 0;
        const pct = peak > 0 ? Math.min(100, Math.round((safe / peak) * 100)) : 0;
        return (
          <p key={i} style={{ margin: "4px 0" }}>
            {b.props.label}{" "}
            <span
              style={{
                display: "inline-block",
                height: "0.55em",
                background: b.props.accent ? ACCENT : "#9aa4b2",
                width: `${pct}%`,
                verticalAlign: "middle",
              }}
            />{" "}
            <small>
              {b.props.value}
              {b.props.note ? ` · ${textOf(b.props.note)}` : ""}
            </small>
          </p>
        );
      })}
      {unit || caption ? (
        <p>
          <small>
            {unit}
            {unit && caption ? " · " : ""}
            {caption}
          </small>
        </p>
      ) : null}
    </div>
  );
}

type MpStepProps = { title: ReactNode; children: ReactNode };
function MpStep(props: MpStepProps): null {
  void props;
  return null;
}

function MpSteps({ children }: { children: ReactNode }) {
  const steps = childElements<MpStepProps>(children);
  return (
    <ol>
      {steps.map((s, i) => (
        <li key={i}>
          <p>
            <strong>{s.props.title}</strong>
          </p>
          {s.props.children}
        </li>
      ))}
    </ol>
  );
}

type MpAccordionItemProps = { title: ReactNode; children: ReactNode };
function MpAccordionItem(props: MpAccordionItemProps): null {
  void props;
  return null;
}

function MpAccordion({ children }: { children: ReactNode }) {
  const items = childElements<MpAccordionItemProps>(children);
  return (
    <div>
      {items.map((item, i) => (
        <div key={i}>
          <p>
            <strong>{item.props.title}</strong>
          </p>
          {item.props.children}
        </div>
      ))}
    </div>
  );
}

function MpKbd({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}

function MpC({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}

function MpBadge({ children }: { children: ReactNode }) {
  return (
    <small>
      <strong>{children}</strong>
    </small>
  );
}

type MpDiProps = { term: ReactNode; desc: ReactNode };
function MpDi(props: MpDiProps): null {
  void props;
  return null;
}

function MpDl({ children }: { children: ReactNode }) {
  const items = childElements<MpDiProps>(children);
  return (
    <dl>
      {items.map((item, i) => (
        <div key={i}>
          <dt>
            <strong>{item.props.term}</strong>
          </dt>
          <dd>{item.props.desc}</dd>
        </div>
      ))}
    </dl>
  );
}

type MpCompareSlotProps = { label?: ReactNode; children: ReactNode };
function MpBefore(props: MpCompareSlotProps): null {
  void props;
  return null;
}
function MpAfter(props: MpCompareSlotProps): null {
  void props;
  return null;
}

function MpCompare({ children }: { children: ReactNode }) {
  const slots = childElements<MpCompareSlotProps>(children);
  const before = slots[0];
  const after = slots[1];
  if (!before || !after) return null;
  return (
    <div>
      <p>
        <strong>{before.props.label ?? "之前"}</strong>
      </p>
      {before.props.children}
      <p>
        <strong>{after.props.label ?? "之后"}</strong>
      </p>
      {after.props.children}
    </div>
  );
}

const MP_CALLOUT_LABEL: Record<string, string> = {
  note: "补充",
  tip: "实践提示",
  warn: "注意",
  key: "要点",
};

function MpCallout({
  kind = "note",
  label,
  zh,
  en,
  children,
}: {
  kind?: string;
  label?: ReactNode;
  zh?: ReactNode;
  en?: ReactNode;
  children?: ReactNode;
}) {
  const body = zh !== undefined || en !== undefined ? zhOf({ zh, en }) : children;
  return (
    <blockquote>
      <p>
        <small>
          — {label ? textOf(label) : (MP_CALLOUT_LABEL[kind] ?? MP_CALLOUT_LABEL.note)}
        </small>
      </p>
      <p>{body}</p>
    </blockquote>
  );
}

type MpCheckProps = { done?: boolean; children: ReactNode };
function MpCheck(props: MpCheckProps): null {
  void props;
  return null;
}

function MpChecklist({ children }: { children: ReactNode }) {
  const items = childElements<MpCheckProps>(children);
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          {item.props.done ? "☑" : "☐"} {item.props.children}
        </li>
      ))}
    </ul>
  );
}

function MpLinkCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: ReactNode;
  desc?: ReactNode;
}) {
  return (
    <p>
      <a href={href}>{title}</a>
      {desc ? <small> — {desc}</small> : null}
    </p>
  );
}

/** Wrap <…> placeholders in the prompt template as accent slots. */
function MpPromptText({ node }: { node: ReactNode }) {
  const raw = textOf(node);
  const parts = raw.split(/(<[^>]+>)/g).filter(Boolean);
  return (
    <pre>
      {parts.map((part, i) =>
        /^<[^>]+>$/.test(part) ? (
          <span key={i} style={{ color: ACCENT }}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </pre>
  );
}

function MpPromptBox({
  model,
  text,
  example,
  children,
  promptId,
}: {
  model?: ReactNode;
  text?: ReactNode;
  example?: ReactNode;
  children?: ReactNode;
  /** Per-chapter prompt index — powers the Mini Program's copy anchor. */
  promptId?: number;
}) {
  return (
    <figure>
      <figcaption>
        <small>
          <strong>提示词</strong>
          {model ? ` · ${textOf(model)}` : ""}
          {promptId !== undefined ? (
            <>
              {" · "}
              <a href={`#kc-prompt-${promptId}`}>复制</a>
            </>
          ) : null}
        </small>
      </figcaption>
      <MpPromptText node={text ?? children} />
      {example ? (
        <div>
          <p>
            <small>
              <strong>示例</strong>
            </small>
          </p>
          <MpPromptText node={example} />
        </div>
      ) : null}
    </figure>
  );
}

type MpGalleryItemProps = {
  src?: string;
  caption?: ReactNode;
  alt?: string;
  label?: ReactNode;
};
function MpGalleryItem(props: MpGalleryItemProps): null {
  void props;
  return null;
}

function MpGallery({ children }: { cols?: number; children: ReactNode }) {
  const items = childElements<MpGalleryItemProps>(children);
  return (
    <div>
      {items.map((item, i) =>
        item.props.src ? (
          <figure key={i}>
            {/* plain <img> by design: string payload for mp-html. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={absoluteUrl(item.props.src)}
              alt={item.props.alt ?? textOf(item.props.caption) ?? "配图"}
            />
            {item.props.caption ? (
              <figcaption>{item.props.caption}</figcaption>
            ) : null}
          </figure>
        ) : null,
      )}
    </div>
  );
}

function MpFootnote({ n }: { n: number }) {
  /* An anchor link, not a bare <sup>: the Mini Program turns the tap into a
     reference bottom sheet (href "#fn-N"), and "#kc-refs" jumps to the list. */
  return (
    <a href={`#fn-${n}`}>
      <sup>
        <span style={{ color: ACCENT }}>{n}</span>
      </sup>
    </a>
  );
}

function MpReferences({ references }: { references: Reference[] }) {
  if (!references.length) return null;
  return (
    <div id="kc-refs">
      <hr />
      <h3>引用与参考</h3>
      <ol>
        {references.map((r) => (
          <li key={r.id} id={`fn-${r.id}`}>
            {r.body ?? r.bodyEn ?? ""}
            {r.url ? (
              <>
                {" "}
                <a href={r.url}>{r.urlLabel ?? r.url}</a>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function mpComponents(ctx: {
  book: BookMeta;
  chapter: Chapter;
  index: number;
  references: Reference[];
}): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: Record<string, any>;
  prompts: { id: number; model: string; template: string; example: string }[];
} {
  const note = <MpDiagramNote />;
  /* PromptBox instances self-register here so the payload can carry the raw
     prompt text (the MP copies from the payload, not from the rendered HTML). */
  let promptCount = 0;
  const prompts: { id: number; model: string; template: string; example: string }[] = [];
  const components = {
    T: MpT,
    StopPunct: MpStopPunct,
    Cover: () => (
      <MpCover book={ctx.book} chapter={ctx.chapter} index={ctx.index} />
    ),
    SectionTitle: MpSectionTitle,
    H3: MpH3,
    Divider: MpDivider,
    Kicker: MpKicker,
    Quote: MpQuote,
    CodeBlock: MpCodeBlock,
    Tabs: MpTabs,
    Tab: MpTab,
    Figure: MpFigure,
    Diagram: MpDiagramNote,
    Stats: MpStats,
    Stat: MpStat,
    PriceTable: MpPriceTable,
    Price: MpPrice,
    Timeline: MpTimeline,
    Milestone: MpMilestone,
    Quadrant: MpQuadrant,
    Cell: MpCell,
    BarCompare: MpBarCompare,
    Bar: MpBar,
    Callout: MpCallout,
    Steps: MpSteps,
    Step: MpStep,
    Accordion: MpAccordion,
    AccordionItem: MpAccordionItem,
    Kbd: MpKbd,
    C: MpC,
    Compare: MpCompare,
    Before: MpBefore,
    After: MpAfter,
    Badge: MpBadge,
    Dl: MpDl,
    Di: MpDi,
    Checklist: MpChecklist,
    Check: MpCheck,
    LinkCard: MpLinkCard,
    PromptBox: (props: {
      model?: ReactNode;
      text?: ReactNode;
      example?: ReactNode;
      children?: ReactNode;
    }) => {
      const id = promptCount++;
      prompts.push({
        id,
        model: textOf(props.model),
        template: textOf(props.text ?? props.children),
        example: textOf(props.example),
      });
      return <MpPromptBox {...props} promptId={id} />;
    },
    Gallery: MpGallery,
    GalleryItem: MpGalleryItem,
    ShowcaseCard: () => note,
    CanonAlbum: () => note,
    KimiStackDiagram: () => note,
    KimiModesDiagram: () => note,
    KimiSwarmDiagram: () => note,
    OpenAIProductMap: () => note,
    OpenAIPickerLadder: () => note,
    OpenAICodexLadder: () => note,
    OpenAITierWalls: () => note,
    Footnote: ({ n }: { n: number }) => <MpFootnote n={n} />,
    References: () => <MpReferences references={ctx.references} />,
  };
  return { components, prompts };
}

/** Strip anything a rich renderer must never see (defensive — the MP
    component map never emits these, and the contract test pins it). */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/\son[a-z]+="[^"]*"/gi, "")
    .replace(/\son[a-z]+='[^']*'/gi, "");
}

export type MpChapterPayload = {
  slug: string;
  number: string;
  title: string;
  readTime: string;
  html: string;
  outline: { id: string; level: number; title: string }[];
  references: { id: number; body: string; url: string; urlLabel: string }[];
  prompts: { id: number; model: string; template: string; example: string }[];
};

/** Render one chapter's MDX to the restricted Mini Program HTML. Throws
    on read/compile failure — the route turns that into a 500 rather
    than shipping a quietly empty chapter (same policy as /print). */
export async function renderChapterToMpHtml(
  book: BookMeta,
  chapter: Chapter,
  index: number,
): Promise<MpChapterPayload> {
  const filePath = path.join(
    process.cwd(),
    "content",
    "books",
    book.slug,
    "chapters",
    `${chapter.slug}.mdx`,
  );
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content: body } = matter(raw);
  const references: Reference[] = Array.isArray(data.references)
    ? (data.references as Reference[])
    : [];

  // Same outline injection as the web chapter page: SectionTitle / H3 /
  // markdown ### all gain stable ids, so the MP's in-chapter outline can
  // scroll to them via mp-html's navigateTo.
  const { outline, body: bodyWithOutlineIds } = extractChapterOutline(body);
  const { components, prompts } = mpComponents({
    book,
    chapter,
    index,
    references,
  });

  const { content } = await compileMDX({
    source: bodyWithOutlineIds,
    components,
    options: {
      blockJS: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            { theme: ZHAPHAR_CODE_THEMES, keepBackground: false },
          ],
          rehypeCodeTitle,
          rehypeSlug,
        ],
      },
    },
  });

  // react-dom/server is disallowed in the RSC module graph, so the import
  // happens at request time inside the route's Node runtime instead of at
  // module top level.
  const { renderToStaticMarkup } = await import("react-dom/server");
  return {
    slug: chapter.slug,
    number: chapterNumber(index),
    title: chapter.title,
    readTime: chapter.readTime,
    html: sanitizeHtml(renderToStaticMarkup(content)),
    outline: outline.map((o) => ({
      id: o.id,
      level: o.level,
      title: o.titleZh || o.titleEn,
    })),
    references: references.map((r) => ({
      id: r.id,
      body: r.body ?? r.bodyEn ?? "",
      url: r.url ?? "",
      urlLabel: r.urlLabel ?? "",
    })),
    prompts,
  };
}
