"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "zh" | "en";

function normalizeLang(value: string | null | undefined): Lang | null {
  return value === "zh" || value === "en" ? value : null;
}

function readInitialLang(): Lang {
  if (typeof document === "undefined") return "zh";
  return normalizeLang(document.documentElement.dataset.lang) ?? "zh";
}

const LangContext = createContext<{ lang: Lang; toggle: () => void }>({
  lang: "zh",
  toggle: () => {},
});

/* The prototype's `data-lang` + CSS toggle, behind a React context.
   The pre-hydration script in layout.tsx already set `data-lang`
   before paint; this keeps it in sync after hydration. */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readInitialLang);

  useEffect(() => {
    let cancelled = false;
    try {
      const requested = normalizeLang(
        new URLSearchParams(window.location.search).get("lang"),
      );
      if (requested) {
        const id = requestAnimationFrame(() => {
          if (!cancelled) setLang(requested);
        });
        return () => {
          cancelled = true;
          cancelAnimationFrame(id);
        };
      }

      const saved = normalizeLang(localStorage.getItem("kimi:lang"));
      if (saved) {
        const id = requestAnimationFrame(() => {
          if (!cancelled) setLang(saved);
        });
        return () => {
          cancelled = true;
          cancelAnimationFrame(id);
        };
      }
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const d = document.documentElement;
    d.setAttribute("data-lang", lang);
    d.lang = lang === "en" ? "en" : "zh-CN";

    // Flip aria-hidden only on explicit bilingual text nodes. A bare
    // [lang] selector would also match <html lang="zh-CN"> and hide
    // the entire page from assistive technology.
    document
      .querySelectorAll<HTMLElement>("[data-i18n-lang]")
      .forEach((el) => {
        const active = el.dataset.i18nLang === lang;
        if (active) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", "true");
      });

    document
      .body.querySelectorAll<HTMLElement>(
        '[lang="zh"]:not([data-i18n-lang]), [lang="en"]:not([data-i18n-lang])',
      )
      .forEach((el) => {
        const active = el.getAttribute("lang") === lang;
        if (active) el.removeAttribute("aria-hidden");
        else el.setAttribute("aria-hidden", "true");
      });
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((l) => {
      const next: Lang = l === "zh" ? "en" : "zh";
      try {
        localStorage.setItem("kimi:lang", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <LangContext.Provider value={{ lang, toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
