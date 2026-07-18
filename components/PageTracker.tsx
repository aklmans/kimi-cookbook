"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

export function PageTracker({ pageSlug }: { pageSlug: string }) {
  useEffect(() => {
    track({ type: "page_view", pageSlug });
  }, [pageSlug]);
  return null;
}
