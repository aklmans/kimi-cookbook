import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { Quote } from "./blocks";
import { CodeTitle } from "./CodeTitle";
import { Divider } from "./structure";

/* MDX element overrides — README CSS-class map.
   Markdown syntax renders into the v3 vocabulary. Chapters mostly use the
   named components; these keep stray markdown on-grid too. */

/* Every markdown paragraph is its own 680px-centred `.prose` block. */
function Paragraph({ children }: { children?: ReactNode }) {
  return (
    <div className="prose">
      <p>{children}</p>
    </div>
  );
}

/* Internal links use <Link>; everything else a plain <a>. */
function Anchor({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  if (href && href.startsWith("/")) return <Link href={href}>{children}</Link>;
  return <a href={href}>{children}</a>;
}

/* Markdown `### …` — id supplied by rehype-slug. */
function Heading3({ id, children }: { id?: string; children?: ReactNode }) {
  return (
    <h3 className="v3-h3" id={id}>
      {id && (
        <a
          className="v3-h3__anchor"
          href={`#${id}`}
          aria-label="复制小节链接 / Copy section link"
        >
          #
        </a>
      )}
      {children}
      <span className="stop">.</span>
    </h3>
  );
}

type LiProps = { children?: ReactNode; __marker?: string };
function ListItem({ children, __marker }: LiProps) {
  return (
    <li className="v3-list__item">
      <span className="v3-list__marker">{__marker ?? "—"}</span>
      <span className="v3-list__body">{children}</span>
    </li>
  );
}

/* `.v3-list` markers: ordered -> "01", "02"…; unordered -> "—". */
function withMarkers(children: ReactNode, ordered: boolean): ReactNode {
  let i = 0;
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const marker = ordered ? String(++i).padStart(2, "0") : "—";
    return cloneElement(child as ReactElement<LiProps>, { __marker: marker });
  });
}

function OrderedList({ children }: { children?: ReactNode }) {
  return <ol className="v3-list">{withMarkers(children, true)}</ol>;
}
function UnorderedList({ children }: { children?: ReactNode }) {
  return (
    <ul className="v3-list v3-list--ul">{withMarkers(children, false)}</ul>
  );
}

/* Markdown fenced code. */
function CodeFence({
  children,
  "data-code-title": title,
}: {
  children?: ReactNode;
  "data-code-title"?: string;
  "data-rehype-pretty-code-title"?: string;
}) {
  return (
    <div className="v3-codeblock">
      {title && <CodeTitle>{title}</CodeTitle>}
      <div className="v3-codeblock__frame">
        <button className="v3-codeblock__copy" data-copy type="button">
          <span lang="zh">复制</span>
          <span lang="en">Copy</span>
        </button>
        <pre className="v3-codeblock__pre">{children}</pre>
      </div>
    </div>
  );
}

/* Markdown `| … |` tables get the v3 table treatment. */
function Table({ children }: { children?: ReactNode }) {
  return (
    <div className="v3-table-wrap">
      <table className="v3-table">{children}</table>
    </div>
  );
}

export const elementComponents = {
  p: Paragraph,
  a: Anchor,
  h3: Heading3,
  ol: OrderedList,
  ul: UnorderedList,
  li: ListItem,
  hr: Divider,
  pre: CodeFence,
  table: Table,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <Quote>{children}</Quote>
  ),
};
