import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { T } from "@/components/T";
import { AssetFrame } from "@/components/AssetFrame";
import { ChecklistClient } from "./ChecklistClient";
import { CodeTitle } from "./CodeTitle";
import { publicAssetExists } from "@/lib/public-assets";

/* ── Quote ──
   In MDX: `<Quote source="…" text="…" />` — the body MUST go in the
   `text` prop.  Children between the tags get paragraph-wrapped by the
   MDX compiler (<p> inside `.v3-quote__text` is invalid).
   In TSX: `<Quote source="…">…</Quote>` — children works fine. */

/* ── CodeBlock vs CodeFence ──
   `<CodeBlock caption="…">…</CodeBlock>` supports an explicit caption.
   Markdown fenced code (``` … ```)  renders via `elements.tsx`'s
   `CodeFence`, which does NOT support a caption.  If you need a
   caption on a code sample, use the `<CodeBlock>` component directly. */
export function Quote({
  source,
  text,
  children,
}: {
  source?: ReactNode;
  text?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <figure className="v3-quote">
      <div className="v3-quote__inner">
        <p className="v3-quote__text">{text ?? children}</p>
        {source && <p className="v3-quote__source">{source}</p>}
      </div>
    </figure>
  );
}

/* `.v3-codeblock` — left-ruled code frame with a Copy button.
   The copy click is delegated to GlobalUI. `children` may be a plain
   string or JSX carrying `.kw` / `.com` / `.str` highlight spans. */
export function CodeBlock({
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
  // <CodeBlock> wraps either a ``` fence (already framed + shiki-highlighted by
  // rehype-pretty-code, via the `pre` → CodeFence mapping) or raw text (an ASCII
  // / pseudo-content block). When it wraps a fence, skip our own frame so it is
  // not double-wrapped (two left-rules + two Copy buttons) — just add the
  // caption. Raw-text children still get the monospace frame here.
  const wrapsFence = Children.toArray(children).some(isValidElement);
  if (wrapsFence) {
    return (
      <div className="v3-codeblock-captioned">
        {filename && <CodeTitle>{filename}</CodeTitle>}
        {children}
        {caption && <p className="v3-codeblock__caption">{caption}</p>}
      </div>
    );
  }

  const block = (
    <div className="v3-codeblock">
      {filename && <CodeTitle>{filename}</CodeTitle>}
      <div className="v3-codeblock__frame">
        <button className="v3-codeblock__copy" data-copy type="button">
          <T zh="复制" en="Copy" />
        </button>
        <pre className="v3-codeblock__pre">
          <code data-language={language}>{children}</code>
        </pre>
      </div>
    </div>
  );

  if (filename) {
    return (
      <div className="v3-codeblock-captioned">
        {block}
        {caption && <p className="v3-codeblock__caption">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="v3-codeblock">
      <div className="v3-codeblock__frame">
        <button className="v3-codeblock__copy" data-copy type="button">
          <T zh="复制" en="Copy" />
        </button>
        <pre className="v3-codeblock__pre">
          <code data-language={language}>{children}</code>
        </pre>
      </div>
      {caption && <p className="v3-codeblock__caption">{caption}</p>}
    </div>
  );
}

type TabProps = { label: ReactNode; children: ReactNode };

function textFromNode(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }
  if (isValidElement(node)) {
    const props = node.props as { zh?: ReactNode; children?: ReactNode };
    return textFromNode(props.zh ?? props.children);
  }
  return "";
}

/* A data-only child of <Tabs>; never rendered on its own. */
export function Tab(props: TabProps): null {
  void props;
  return null;
}

/* `.v3-tabs` — tab switching is delegated to GlobalUI. */
export function Tabs({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  const tabs = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<TabProps>[];
  const printLabels = tabs.map(
    (tab, i) => textFromNode(tab.props.label) || `Tab ${i + 1}`,
  );

  return (
    <div className="v3-tabs">
      <div className="v3-tabs__bar" role="tablist">
        {tabs.map((t, i) => (
          <button
            key={i}
            className={`v3-tab${i === 0 ? " is-active" : ""}`}
            data-tab={`t${i}`}
            id={`tab-${i}`}
            role="tab"
            type="button"
            aria-selected={i === 0}
            aria-controls={`panel-${i}`}
            tabIndex={i === 0 ? 0 : -1}
          >
            {t.props.label}
          </button>
        ))}
      </div>
      <div className="v3-tabs__panels">
        {tabs.map((t, i) => (
          <div
            key={i}
            className={`v3-tabs__panel${i === 0 ? " is-active" : ""}`}
            data-panel={`t${i}`}
            data-print-label={printLabels[i]}
            id={`panel-${i}`}
            role="tabpanel"
            aria-labelledby={`tab-${i}`}
          >
            {t.props.children}
          </div>
        ))}
      </div>
      {caption && <p className="v3-codeblock__caption">{caption}</p>}
    </div>
  );
}

/* `.v3-figure` — placeholder figure (the prototype ships no real images). */
export function Figure({
  label,
  caption,
  ratio = "16 / 9",
  src,
  alt,
}: {
  label: ReactNode;
  caption: ReactNode;
  ratio?: string;
  src?: string;
  alt?: string;
}) {
  const hasImage = publicAssetExists(src);

  return (
    <figure
      className="v3-figure"
      {...(hasImage && src ? { "data-lightbox-src": src } : {})}
    >
      <AssetFrame
        className="v3-figure__img"
        src={src}
        available={hasImage}
        alt={alt ?? "配图 / Figure"}
        placeholder={label}
        fit="contain"
        sizes="(max-width: 760px) calc(100vw - 48px), 720px"
        style={{
          aspectRatio: ratio,
        }}
      />
      <figcaption className="v3-figure__caption">{caption}</figcaption>
    </figure>
  );
}

/* ── Diagram ──
   `<Diagram caption="…"><svg>…</svg></Diagram>` — frame + caption around an
   INLINE svg. Unlike <Figure src>, the svg lives in the DOM, so its fills can
   resolve CSS variables (`.v3-diagram svg .dgm-ink { fill: var(--ink) }`) and
   it follows light/dark + prints correctly. Use for free-form themed diagrams
   (give svg elements .dgm-* classes; colors come from the Round-33 CSS). */
export function Diagram({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="v3-diagram">
      <div className="v3-diagram__frame">{children}</div>
      {caption && (
        <figcaption className="v3-diagram__caption">{caption}</figcaption>
      )}
    </figure>
  );
}

/* ── Stats ──
   `<Stats cols={4} caption="…"><Stat value="…" label="…" unit? sub? />…</Stats>`
   A headline-metric strip — pulls spec numbers out of prose. <Stat> is a
   data-only child (like Di/Step/Check); colors are token-driven (Round-34). */
type StatProps = {
  value: ReactNode;
  label: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
};

export function Stat(props: StatProps): null {
  void props;
  return null;
}

export function Stats({
  cols = 3,
  caption,
  children,
}: {
  cols?: number;
  caption?: ReactNode;
  children: ReactNode;
}) {
  const items = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<StatProps>[];

  return (
    <div className="v3-stats">
      <div
        className="v3-stats__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        role="list"
      >
        {items.map((it, i) => (
          <div key={i} className="v3-stats__item" role="listitem">
            <p className="v3-stats__value">
              {it.props.value}
              {it.props.unit && (
                <span className="v3-stats__unit">{it.props.unit}</span>
              )}
            </p>
            <p className="v3-stats__label">{it.props.label}</p>
            {it.props.sub && <p className="v3-stats__sub">{it.props.sub}</p>}
          </div>
        ))}
      </div>
      {caption && <p className="v3-stats__caption">{caption}</p>}
    </div>
  );
}

/* ── PriceTable ──
   `<PriceTable asOf="2026-06" unit="¥ / 百万 token" caption="…">
      <Price model="…" note? input cached output context highlight? />…
    </PriceTable>`
   Standardizes the recurring model | input | cached | output | context table.
   Bilingual headers (default zh/en); <Price> is a data-only child. */
type PriceProps = {
  model: ReactNode;
  note?: ReactNode;
  input?: ReactNode;
  cached?: ReactNode;
  output?: ReactNode;
  context?: ReactNode;
  highlight?: boolean;
};

export function Price(props: PriceProps): null {
  void props;
  return null;
}

export function PriceTable({
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
  const rows = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<PriceProps>[];

  return (
    <div className="v3-pricetable">
      <div className="v3-pricetable__head">
        <span className="v3-pricetable__label">
          {label ?? <T zh="模型定价" en="Model pricing" />}
        </span>
        {asOf && (
          <span className="v3-pricetable__asof">
            <T zh="截至" en="as of" /> {asOf}
          </span>
        )}
      </div>
      <div className="v3-pricetable__wrap">
        <table className="v3-pricetable__table">
          <thead>
            <tr>
              <th className="v3-pricetable__th-model">
                <T zh="模型" en="Model" />
              </th>
              <th>
                <T zh="输入" en="Input" />
              </th>
              <th>
                <T zh="缓存命中" en="Cached" />
              </th>
              <th>
                <T zh="输出" en="Output" />
              </th>
              <th>
                <T zh="上下文" en="Context" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={r.props.highlight ? "is-highlight" : undefined}
              >
                <td className="v3-pricetable__model">
                  <code>{r.props.model}</code>
                  {r.props.note && (
                    <span className="v3-pricetable__note">{r.props.note}</span>
                  )}
                </td>
                <td className="v3-pricetable__num">{r.props.input ?? "—"}</td>
                <td className="v3-pricetable__num">{r.props.cached ?? "—"}</td>
                <td className="v3-pricetable__num">{r.props.output ?? "—"}</td>
                <td className="v3-pricetable__num v3-pricetable__ctx">
                  {r.props.context ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(unit || caption) && (
        <p className="v3-pricetable__caption">
          {unit && <span className="v3-pricetable__unit">{unit}</span>}
          {unit && caption ? " · " : null}
          {caption}
        </p>
      )}
    </div>
  );
}

/* ── Timeline ──
   `<Timeline caption="…"><Milestone date="…" label="…" note? current? />…</Timeline>`
   Vertical version/model lineage. <Milestone> is a data-only child (named
   Milestone, not Event, to avoid the global Event type). Token-driven (Round-36). */
type MilestoneProps = {
  date?: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  current?: boolean;
};

export function Milestone(props: MilestoneProps): null {
  void props;
  return null;
}

export function Timeline({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  const events = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<MilestoneProps>[];

  return (
    <div className="v3-timeline">
      <ol className="v3-timeline__list">
        {events.map((e, i) => (
          <li
            key={i}
            className={`v3-timeline__item${e.props.current ? " is-current" : ""}`}
          >
            <span className="v3-timeline__dot" aria-hidden="true" />
            <div className="v3-timeline__body">
              {e.props.date && (
                <span className="v3-timeline__date">{e.props.date}</span>
              )}
              <span className="v3-timeline__label">{e.props.label}</span>
              {e.props.note && (
                <span className="v3-timeline__note">{e.props.note}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {caption && <p className="v3-timeline__caption">{caption}</p>}
    </div>
  );
}

/* ── Quadrant ──
   `<Quadrant caption="…"><Cell label="…" highlight?>…</Cell>×4</Quadrant>`
   A 2×2 matrix; the four <Cell> children fill it row-major (TL, TR, BL, BR).
   <Cell> is a data-only child. Token-driven (Round-37). */
type CellProps = { label?: ReactNode; highlight?: boolean; children?: ReactNode };

export function Cell(props: CellProps): null {
  void props;
  return null;
}

export function Quadrant({
  caption,
  children,
}: {
  caption?: ReactNode;
  children: ReactNode;
}) {
  const cells = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<CellProps>[];

  return (
    <figure className="v3-quadrant">
      <div className="v3-quadrant__grid">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`v3-quadrant__cell${c.props.highlight ? " is-highlight" : ""}`}
          >
            {c.props.label && (
              <span className="v3-quadrant__cell-label">{c.props.label}</span>
            )}
            <span className="v3-quadrant__cell-body">{c.props.children}</span>
          </div>
        ))}
      </div>
      {caption && (
        <figcaption className="v3-quadrant__caption">{caption}</figcaption>
      )}
    </figure>
  );
}

/* ── BarCompare ──
   `<BarCompare unit="…" caption="…"><Bar label="…" value="6.50" accent? note? />…</BarCompare>`
   A small horizontal comparison chart (2–6 bars). value is parsed for the bar
   width and shown verbatim. <Bar> is a data-only child. Token-driven (Round-38). */
type BarProps = {
  label: ReactNode;
  value: string | number;
  note?: ReactNode;
  accent?: boolean;
};

export function Bar(props: BarProps): null {
  void props;
  return null;
}

export function BarCompare({
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
  const bars = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<BarProps>[];
  const peak =
    max ?? Math.max(0, ...bars.map((b) => Number(b.props.value) || 0));

  return (
    <div className="v3-barcompare">
      <div className="v3-barcompare__rows">
        {bars.map((b, i) => {
          const v = Number(b.props.value);
          const safe = Number.isFinite(v) ? Math.max(0, v) : 0;
          const pct = peak > 0 ? Math.min(100, (safe / peak) * 100) : 0;
          return (
            <div key={i} className="v3-barcompare__row">
              <span className="v3-barcompare__label">{b.props.label}</span>
              <span className="v3-barcompare__track" aria-hidden="true">
                <span
                  className={`v3-barcompare__fill${b.props.accent ? " is-accent" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="v3-barcompare__value">
                {b.props.value}
                {b.props.note && (
                  <span className="v3-barcompare__note">{b.props.note}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {(unit || caption) && (
        <p className="v3-barcompare__caption">
          {unit && <span className="v3-barcompare__unit">{unit}</span>}
          {unit && caption ? " · " : null}
          {caption}
        </p>
      )}
    </div>
  );
}

/* ── Steps ──
   `<Steps><Step title="…">…body…</Step>…</Steps>`
   Structured numbered procedure. Step is a data-only child (like Tab). */
type StepProps = { title: ReactNode; children: ReactNode };

export function Step(props: StepProps): null {
  void props;
  return null;
}

export function Steps({ children }: { children: ReactNode }) {
  const steps = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<StepProps>[];

  return (
    <div className="v3-steps">
      {steps.map((s, i) => (
        <div
          key={i}
          className={`v3-steps__item${i === steps.length - 1 ? " v3-steps__item--last" : ""}`}
        >
          <div className="v3-steps__number">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="v3-steps__body">
            <p className="v3-steps__title">{s.props.title}</p>
            <div className="v3-steps__desc">{s.props.children}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Accordion ──
   `<Accordion><AccordionItem title="…">…</AccordionItem>…</Accordion>`
   Div-based collapsible panels. Toggle delegated to GlobalUI via
   `data-accordion-toggle`, same pattern as Tabs `data-tab`. */
type AccordionItemProps = { title: ReactNode; children: ReactNode };

export function AccordionItem(props: AccordionItemProps): null {
  void props;
  return null;
}

export function Accordion({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<AccordionItemProps>[];

  return (
    <div className="v3-accordion">
      {items.map((item, i) => (
        <div key={i} className="v3-accordion__item">
          <button
            className="v3-accordion__summary"
            data-accordion-toggle
            type="button"
            aria-expanded="false"
          >
            <span className="v3-accordion__title">{item.props.title}</span>
            <span className="v3-accordion__icon" aria-hidden="true" />
          </button>
          <div className="v3-accordion__content">{item.props.children}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Kbd ──
   `<Kbd>⌘</Kbd> + <Kbd>K</Kbd>` — keyboard key cap. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="v3-kbd">{children}</kbd>;
}

/* ── C (inline code shorthand) ──
   `<C>meta.ts</C>` — renders a styled <code> element.
   Much shorter than raw `<code>` when used inside <T> JSX props. */
export function C({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}

/* ── Badge ──
   `<Badge kind="new">新功能</Badge>` — inline status label. */
type BadgeKind = "default" | "new" | "optional" | "beta" | "deprecated";

export function Badge({
  kind = "default",
  children,
}: {
  kind?: BadgeKind;
  children: ReactNode;
}) {
  return <span className={`v3-badge v3-badge--${kind}`}>{children}</span>;
}

/* ── Dl (Definition List) ──
   `<Dl><Di term="…" desc={…} />…</Dl>`
   Di is a data-only child (like Tab / Step). */
type DiProps = { term: ReactNode; desc: ReactNode };

export function Di(props: DiProps): null {
  void props;
  return null;
}

export function Dl({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<DiProps>[];

  return (
    <dl className="v3-dl">
      {items.map((item, i) => (
        <div key={i} className="v3-dl__entry">
          <dt className="v3-dl__term">{item.props.term}</dt>
          <dd className="v3-dl__desc">{item.props.desc}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Compare ──
   `<Compare><Before label="…">…</Before><After label="…">…</After></Compare>`
   Side-by-side comparison. Before/After are data-only children. */
type CompareSlotProps = { label?: ReactNode; children: ReactNode };

export function Before(props: CompareSlotProps): null {
  void props;
  return null;
}
export function After(props: CompareSlotProps): null {
  void props;
  return null;
}

export function Compare({ children }: { children: ReactNode }) {
  const slots = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<CompareSlotProps>[];
  const before = slots[0];
  const after = slots[1];
  if (!before || !after) return null;

  const beforeLabel = before.props.label ?? <T zh="之前" en="Before" />;
  const afterLabel = after.props.label ?? <T zh="之后" en="After" />;

  return (
    <div className="v3-compare">
      <div className="v3-compare__slot">
        <p className="v3-compare__label">{beforeLabel}</p>
        <div className="v3-compare__body">{before.props.children}</div>
      </div>
      <div className="v3-compare__divider" aria-hidden="true" />
      <div className="v3-compare__slot">
        <p className="v3-compare__label">{afterLabel}</p>
        <div className="v3-compare__body">{after.props.children}</div>
      </div>
    </div>
  );
}

type CalloutKind = "note" | "tip" | "warn" | "key";
const CALLOUT_LABEL: Record<CalloutKind, ReactNode> = {
  note: <T zh="补充" en="Note" />,
  tip: <T zh="实践提示" en="Tip" />,
  warn: <T zh="注意" en="Warning" />,
  key: <T zh="要点" en="Key" />,
};

/* `.v3-callout` — `<Callout kind="tip" zh="…" en="…" />`.
   Like Quote, MDX callers pass the bilingual body via props (`zh`/`en`)
   so the MDX compiler never paragraph-wraps it inside `.v3-callout__body`. */
export function Callout({
  kind = "note",
  label,
  zh,
  en,
  children,
}: {
  kind?: CalloutKind;
  label?: ReactNode;
  zh?: ReactNode;
  en?: ReactNode;
  children?: ReactNode;
}) {
  const body =
    zh !== undefined || en !== undefined ? (
      <T zh={zh ?? en ?? ""} en={en} />
    ) : (
      children
    );
  return (
    <aside className={`v3-callout v3-callout--${kind}`}>
      <div className="v3-callout__inner">
        <p className="v3-callout__label">— {label ?? CALLOUT_LABEL[kind]}</p>
        <p className="v3-callout__body">{body}</p>
      </div>
    </aside>
  );
}

/* ── Checklist ──
   `<Checklist><Check done>已完成</Check><Check>待完成</Check></Checklist>`
   Click-to-toggle verification list; checked state is cached per chapter in
   localStorage (see ChecklistClient). `done` is the initial default. */
type CheckProps = { done?: boolean; children: ReactNode };

export function Check(props: CheckProps): null {
  void props;
  return null;
}

/* Flatten a node's visible text for a stable per-item storage key. Includes
   both sides of a bilingual <T zh en> so the key is language-independent. */
function checkItemText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(checkItemText).join("");
  if (isValidElement(node)) {
    const props = node.props as {
      zh?: ReactNode;
      en?: ReactNode;
      children?: ReactNode;
    };
    if (props.zh !== undefined || props.en !== undefined) {
      return `${checkItemText(props.zh)}${checkItemText(props.en)}`;
    }
    return checkItemText(props.children);
  }
  return "";
}

/* djb2 — compact, stable hash for the localStorage key of one checklist line. */
function checkItemHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function Checklist({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<CheckProps>[];

  // Content-hash keys; disambiguate the rare duplicate-text case with a suffix
  // so two identical lines don't share one stored checkbox.
  const seen = new Map<string, number>();
  const resolved = items.map((item) => {
    const base = checkItemHash(checkItemText(item.props.children));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return {
      key: n === 0 ? base : `${base}.${n}`,
      node: item.props.children,
      defaultDone: Boolean(item.props.done),
    };
  });

  return <ChecklistClient items={resolved} />;
}

/* ── LinkCard ──
   `<LinkCard href="…" title="…" desc="…" />`
   Styled external resource link. */
export function LinkCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: ReactNode;
  desc?: ReactNode;
}) {
  return (
    <a
      className="v3-linkcard"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="v3-linkcard__body">
        <span className="v3-linkcard__title">{title}</span>
        {desc && <span className="v3-linkcard__desc">{desc}</span>}
      </span>
      <span className="v3-linkcard__arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}

/* ── PromptBox ──
   `<PromptBox model="Midjourney" text="…" />`
   Styled AI prompt display — distinct from CodeBlock. Uses text font,
   accent tint background, "PROMPT" label. Copy button reuses data-copy
   mechanism via <pre>. MDX callers pass body in `text` prop (same
   pattern as Quote) to avoid paragraph wrapping. */
/* Wrap <…> placeholders in a styled "slot" so the fill-in points are obvious. */
function withSlots(s: string): ReactNode[] {
  return s.split(/(<[^>]+>)/g).map((part, i) =>
    /^<[^>]+>$/.test(part) ? (
      <span key={i} className="v3-promptbox__slot">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/* The template text is authored as <T zh="…<slot>…" en="…" />. Re-render its
   strings with the slots highlighted, keeping the bilingual <T> mechanism
   (lang spans + [lang] CSS). Non-<T> / non-string content renders as-is. */
function renderTemplate(node: ReactNode): ReactNode {
  if (typeof node === "string") return withSlots(node);
  if (isValidElement(node)) {
    const p = node.props as { zh?: unknown; en?: unknown };
    if (typeof p.zh === "string") {
      const en = typeof p.en === "string" && p.en ? p.en : p.zh;
      return (
        <>
          <span lang="zh" data-i18n-lang="zh">
            {withSlots(p.zh)}
          </span>
          <span lang="en" data-i18n-lang="en" aria-hidden="true">
            {withSlots(en)}
          </span>
        </>
      );
    }
  }
  return node;
}

export function PromptBox({
  model,
  text,
  example,
  children,
}: {
  model?: ReactNode;
  /** Reusable template; <…> placeholders are auto-highlighted as fill-in slots. */
  text?: ReactNode;
  /** Optional worked example — a filled, copy-ready instance. When present the
      box gains 模板 / 示例 tabs; Copy copies whichever tab is active. */
  example?: ReactNode;
  children?: ReactNode;
}) {
  const template = renderTemplate(text ?? children);
  return (
    <div className="v3-promptbox">
      <div className="v3-promptbox__frame">
        <div className="v3-promptbox__header">
          <span className="v3-promptbox__label">
            <T zh="提示词" en="Prompt" />
          </span>
          <span className="v3-promptbox__header-right">
            {model && <span className="v3-promptbox__model">{model}</span>}
            <button className="v3-promptbox__copy" data-copy type="button">
              <T zh="复制" en="Copy" />
            </button>
          </span>
        </div>
        {example ? (
          <div className="v3-tabs v3-promptbox__tabs">
            <div className="v3-tabs__bar" role="tablist">
              <button
                className="v3-tab is-active"
                data-tab="t0"
                role="tab"
                type="button"
                aria-selected="true"
                tabIndex={0}
              >
                <T zh="模板" en="Template" />
              </button>
              <button
                className="v3-tab"
                data-tab="t1"
                role="tab"
                type="button"
                aria-selected="false"
                tabIndex={-1}
              >
                <T zh="示例" en="Example" />
              </button>
            </div>
            <div className="v3-tabs__panels">
              <div className="v3-tabs__panel is-active" data-panel="t0" role="tabpanel">
                <pre className="v3-promptbox__text">{template}</pre>
              </div>
              <div className="v3-tabs__panel" data-panel="t1" role="tabpanel">
                <pre className="v3-promptbox__text">{example}</pre>
              </div>
            </div>
          </div>
        ) : (
          <pre className="v3-promptbox__text">{template}</pre>
        )}
      </div>
    </div>
  );
}

/* ── Gallery ──
   `<Gallery cols={3}><GalleryItem src="…" caption="…" /></Gallery>`
   Image grid for AI-generated images, screenshots, etc.
   GalleryItem is a data-only child. Gallery renders the grid with
   AssetFrame for each image. Lightbox support via data-lightbox-src. */
type GalleryItemProps = {
  src?: string;
  caption?: ReactNode;
  alt?: string;
  label?: ReactNode;
};

export function GalleryItem(props: GalleryItemProps): null {
  void props;
  return null;
}

export function Gallery({
  cols = 2,
  ratio = "1",
  caption,
  children,
}: {
  cols?: number;
  ratio?: string;
  caption?: ReactNode;
  children: ReactNode;
}) {
  const items = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<GalleryItemProps>[];

  return (
    <figure className="v3-gallery">
      <div
        className="v3-gallery__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {items.map((item, i) => {
          const hasImage = publicAssetExists(item.props.src);
          return (
            <div
              key={i}
              className="v3-gallery__item"
              {...(hasImage && item.props.src
                ? { "data-lightbox-src": item.props.src }
                : {})}
            >
              <AssetFrame
                className="v3-gallery__img"
                src={item.props.src}
                available={hasImage}
                alt={item.props.alt ?? "图库配图 / Gallery image"}
                placeholder={item.props.label ?? `${i + 1}`}
                fit="cover"
                sizes={`(max-width: 760px) calc(50vw - 36px), ${Math.floor(720 / cols)}px`}
                style={{ aspectRatio: ratio }}
              />
              {item.props.caption && (
                <p className="v3-gallery__caption">{item.props.caption}</p>
              )}
            </div>
          );
        })}
      </div>
      {caption && (
        <figcaption className="v3-gallery__fcaption">{caption}</figcaption>
      )}
    </figure>
  );
}

/* ── ShowcaseCard ──
   `<ShowcaseCard type="web" href="…" title="…" desc="…" />`
   Project deliverable link with type indicator badge. Types:
   web / slides / sheet / repo / commit / file. */
type ShowcaseType = "web" | "slides" | "sheet" | "repo" | "commit" | "file";

const SHOWCASE_LABELS: Record<ShowcaseType, string> = {
  web: "WEB",
  slides: "SLIDES",
  sheet: "SHEET",
  repo: "REPO",
  commit: "COMMIT",
  file: "FILE",
};

export function ShowcaseCard({
  type = "web",
  href,
  title,
  desc,
}: {
  type?: ShowcaseType;
  href: string;
  title: ReactNode;
  desc?: ReactNode;
}) {
  return (
    <a
      className={`v3-showcase v3-showcase--${type}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="v3-showcase__type">{SHOWCASE_LABELS[type]}</span>
      <span className="v3-showcase__body">
        <span className="v3-showcase__title">{title}</span>
        {desc && <span className="v3-showcase__desc">{desc}</span>}
      </span>
      <span className="v3-showcase__arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}
