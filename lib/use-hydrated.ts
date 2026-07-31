"use client";

import { useSyncExternalStore } from "react";

/* Hydration flag WITHOUT an effect: the server snapshot is false (SSR
   and the hydration render agree — no mismatch), the client snapshot is
   true, and there is nothing to subscribe to, so React re-renders with
   the client snapshot right after hydration.

   This replaces the `useEffect + requestAnimationFrame(() => setState)`
   pattern: rAF callbacks only run before a composite, so in any
   environment that doesn't continuously paint (background tabs,
   occluded pages, automation) the "post-mount" state could stay stale
   indefinitely — a theme flip in a hidden tab left BookPosterLink's
   href pointing at the wrong poster variant until a screenshot forced
   a composite. Deriving at render time removes the paint dependency
   (and keeps react-compiler's no-setState-in-effect rule happy). */
const emptySubscribe = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
