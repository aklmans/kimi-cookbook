import type { ReactNode } from "react";

/**
 * Bilingual inline text.
 * Renders BOTH spans; the verbatim v3.css `[lang]` rules hide the
 * inactive one based on `<html data-lang>`. This keeps it a Server
 * Component and avoids any hydration mismatch (both spans always
 * exist in the DOM regardless of language).
 *
 * `en` is optional — when omitted, null, or empty, the en slot
 * renders the `zh` content instead. This makes Chinese-only books
 * degrade gracefully: switching the site to English still leaves
 * the book's Chinese-only text readable instead of going blank.
 * Pair with a top-of-page "Chinese only" notice when appropriate
 * so the reader knows why nothing translated.
 */
export function T({ zh, en }: { zh: ReactNode; en?: ReactNode }) {
  const enContent = en == null || en === "" ? zh : en;
  return (
    <>
      <span lang="zh" data-i18n-lang="zh">
        {zh}
      </span>
      {/* Default data-lang is "zh", so en starts aria-hidden.
          LangProvider's effect toggles aria-hidden on language switch. */}
      <span lang="en" data-i18n-lang="en" aria-hidden="true">
        {enContent}
      </span>
    </>
  );
}
