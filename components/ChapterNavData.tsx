"use client";

import { useEffect } from "react";

/* The prototype carried prev/next/first/last on `<body data-*>` so the
   global keyboard handler in v3.js could read them. We keep that bridge:
   GlobalUI's ←/→/Home/End handler reads `document.body.dataset`. */
export function ChapterNavData({
  prev,
  next,
  first,
  last,
}: {
  prev?: string;
  next?: string;
  first?: string;
  last?: string;
}) {
  useEffect(() => {
    const b = document.body;
    if (prev) b.dataset.prev = prev;
    if (next) b.dataset.next = next;
    if (first) b.dataset.first = first;
    if (last) b.dataset.last = last;
    return () => {
      delete b.dataset.prev;
      delete b.dataset.next;
      delete b.dataset.first;
      delete b.dataset.last;
    };
  }, [prev, next, first, last]);

  return null;
}
