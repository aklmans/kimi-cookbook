"use client";

import { useEffect } from "react";

/* Adds `has-internal-ribbon` to <body> so the verbatim CSS offsets the
   sticky header below the showcase ribbon. */
export function InternalRibbonClass() {
  useEffect(() => {
    document.body.classList.add("has-internal-ribbon");
    return () => document.body.classList.remove("has-internal-ribbon");
  }, []);
  return null;
}
