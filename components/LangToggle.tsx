"use client";

import { useLang } from "./LangProvider";

/* Replaces the prototype's `[data-lang-toggle]` button. The label shows
   the OTHER language — i.e. what clicking will switch to. */
export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      className="v3-header__lang"
      data-lang-toggle
      type="button"
      aria-label="切换语言 / Switch language"
      onClick={toggle}
    >
      <span data-lang-icon suppressHydrationWarning>
        {lang === "zh" ? "EN" : "中"}
      </span>
    </button>
  );
}
