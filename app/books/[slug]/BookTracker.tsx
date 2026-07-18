"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics-client";

export function BookTracker({ slug }: { slug: string }) {
  useEffect(() => {
    track({ type: "book_view", bookSlug: slug });
  }, [slug]);
  return null;
}
