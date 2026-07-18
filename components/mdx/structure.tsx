import type { ReactNode } from "react";
import { StopPunct } from "./StopPunct";

/* `.v3-section` — `<SectionTitle number="I">…</SectionTitle>` */
export function SectionTitle({
  id,
  number,
  children,
}: {
  id?: string;
  number: string;
  children: ReactNode;
}) {
  return (
    <section className="v3-section" id={id}>
      <p className="v3-section__number">— {number}</p>
      <h2 className="v3-section__title">
        {children}
        <StopPunct />
      </h2>
    </section>
  );
}

/* `.v3-h3` — third-level heading. When `id` is given, the hover-revealed
   copy anchor is attached (click handled by GlobalUI's delegation). */
export function H3({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
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
      <StopPunct />
    </h3>
  );
}

/* `.v3-divider` — the centred ". . ." (content from CSS ::before). */
export function Divider() {
  return <div className="v3-divider" aria-hidden="true" />;
}

/* `.v3-kicker` — closing manifesto. `zh` / `en` are multi-line strings
   (CSS `white-space: pre-line`); the trailing orange period is added here.
   `en` is optional — when omitted, the en paragraph renders the `zh`
   string too, matching <T>'s zh-only-book fallback behavior. */
export function Kicker({
  zh,
  en,
  sig,
}: {
  zh: string;
  en?: string;
  sig?: string;
}) {
  const enText = en == null || en === "" ? zh : en;
  return (
    <div className="v3-kicker">
      <p className="v3-kicker__text" lang="zh">
        {zh}
        <span className="stop">.</span>
      </p>
      <p className="v3-kicker__text" lang="en">
        {enText}
        <span className="stop">.</span>
      </p>
      {sig && <p className="v3-kicker__sig">{sig}</p>}
    </div>
  );
}
