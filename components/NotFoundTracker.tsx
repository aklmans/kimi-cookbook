"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

/** Fires a `not_found` signal with the current pathname when the 404 boundary
    mounts. Renders nothing. The route sanitizes to the path only (no query /
    hash), so no arbitrary junk or PII is persisted. */
export function NotFoundTracker() {
  useEffect(() => {
    track({ type: "not_found", path: window.location.pathname });
  }, []);
  return null;
}
