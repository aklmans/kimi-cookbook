"use client";

import { useState, useRef, useEffect, type ReactNode, type MouseEvent } from "react";
import Link from "next/link";

export type ChapterIndexItem = {
  key: string;
  num: string;
  title: ReactNode;
  time: ReactNode;
  href: string;
  isCurrent: boolean;
};

/**
 * The chapter-nav "In This Book" index. Click-to-toggle, not hover: the old
 * hover popover dropped the moment the pointer crossed the gap to reach it, so
 * you could never actually click a chapter. Now clicking the "NN / MM" trigger
 * pins the popover open (it stays until you pick a chapter, click away, or press
 * Escape). On phones the popover is `display:none` (globals.css), so there the
 * trigger just follows its link to the book page — hence the desktop-only
 * `preventDefault` and the real `href`, which also keeps it working without JS.
 */
export function ChapterIndexMenu({
  number,
  total,
  bookHref,
  label,
  footLabel,
  items,
}: {
  number: string;
  total: string;
  bookHref: string;
  label: ReactNode;
  footLabel: ReactNode;
  items: ChapterIndexItem[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const onTriggerClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Desktop (popover visible): toggle it. Phone (popover display:none):
    // let the link navigate to the book page.
    if (window.matchMedia("(min-width: 761px)").matches) {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <div
      className={`ch-nav__index-wrap${open ? " is-open" : ""}`}
      ref={wrapRef}
    >
      <Link
        className="ch-nav__index"
        href={bookHref}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="打开目录 / Open table of contents"
        onClick={onTriggerClick}
      >
        <span className="accent">{number}</span> / {total}
        <span className="ch-nav__index-caret" aria-hidden="true" />
      </Link>

      <nav className="ch-toc" aria-label="本书目录 / Chapters in this book">
        <p className="ch-toc__label">— {label}</p>
        <ul className="ch-toc__list">
          {items.map((it) => {
            const inner = (
              <>
                <span className="ch-toc__num">{it.num}</span>
                <span className="ch-toc__title">{it.title}</span>
                <span className="ch-toc__time">{it.time}</span>
              </>
            );
            return (
              <li
                className={`ch-toc__item${it.isCurrent ? " is-current" : ""}`}
                key={it.key}
              >
                {it.isCurrent ? (
                  <span className="ch-toc__link" aria-current="page">
                    {inner}
                  </span>
                ) : (
                  <Link
                    className="ch-toc__link"
                    href={it.href}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        <Link
          className="ch-toc__footlink"
          href={bookHref}
          onClick={() => setOpen(false)}
        >
          {footLabel}
        </Link>
      </nav>
    </div>
  );
}
