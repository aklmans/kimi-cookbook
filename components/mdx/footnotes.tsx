import { T } from "@/components/T";
import { StopPunct } from "./StopPunct";

/* `references` lives in each chapter MDX file's frontmatter
   (README CSS-class map · `.v3-refs`). `bodyEn` / `tipEn` are
   optional — when absent the <T> component falls back to the zh
   version, so zh-only books can omit them entirely. */
export type Reference = {
  id: number;
  body: string;
  bodyEn?: string;
  /** Short hover-tip text; falls back to `body` when absent. */
  tip?: string;
  tipEn?: string;
  url?: string;
  urlLabel?: string;
};

/* `.v3-fn` — inline footnote marker + CSS hover tooltip.
   `<Footnote n={1} />`; the tip text is pulled from frontmatter. */
export function Footnote({
  n,
  references,
}: {
  n: number;
  references: Reference[];
}) {
  const ref = references.find((r) => r.id === n);
  return (
    <span className="v3-fn">
      <a className="v3-fn-ref" href={`#fn-${n}`} id={`fnref-${n}`}>
        {n}
      </a>
      <span className="v3-fn-tip">
        <span className="v3-fn-tip__num"><T zh={`注 ${n}`} en={`Note ${n}`} /></span>
        {ref && (
          <T
            zh={ref.tip ?? ref.body}
            en={ref.tipEn ?? ref.bodyEn ?? ref.tip ?? ref.body}
          />
        )}
      </span>
    </span>
  );
}

/* `.v3-refs` — end-of-chapter reference list. */
export function References({ references }: { references: Reference[] }) {
  if (!references.length) return null;
  return (
    <aside className="v3-refs" aria-label="引用与参考 / References">
      <p className="v3-refs__label">
        — <T zh="引用与参考" en="References" />
      </p>
      <h3 className="v3-refs__title">
        <T zh="参考" en="References" />
        <StopPunct />
      </h3>
      <ol className="v3-refs__list">
        {references.map((r) => (
          <li className="v3-refs__item" id={`fn-${r.id}`} key={r.id}>
            <span className="v3-refs__num">
              {String(r.id).padStart(2, "0")}
            </span>
            <div className="v3-refs__body">
              <T zh={r.body} en={r.bodyEn} />
              {r.url && (
                <>
                  {" "}
                  <a href={r.url}>{r.urlLabel ?? r.url}</a>
                </>
              )}
            </div>
            <a
              className="v3-refs__back"
              href={`#fnref-${r.id}`}
              aria-label="返回引用处 / Back to footnote"
            >
              ↩
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
