"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/* Interactive, persistent checklist. The server `<Checklist>` (blocks.tsx)
   computes a stable content-hash `key` per item and hands the rendered nodes
   here. Each row is click-to-toggle; checked state is cached per chapter in
   localStorage (keyed by pathname), so it survives reloads and revisits.

   State is read via useSyncExternalStore so that SSR + hydration use the
   server snapshot (defaults → no hydration mismatch), the persisted value is
   applied immediately after hydration, and edits in another tab sync live.
   The store returns the raw string (a primitive, stable under Object.is); the
   object is parsed once per change in a useMemo. Keys are content hashes, not
   indexes, so reordering lines keeps each check attached to its text. */
export type ChecklistItem = {
  key: string;
  node: ReactNode;
  defaultDone: boolean;
};

const STORAGE_PREFIX = "kimi:checklist:";
const SAME_TAB_EVENT = "kimi:checklist-change";
const EMPTY: Record<string, boolean> = {};

const getServerSnapshot = (): string | null => null;

export function ChecklistClient({ items }: { items: ChecklistItem[] }) {
  const pathname = usePathname();
  const storageKey = STORAGE_PREFIX + pathname;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === storageKey) onChange();
      };
      window.addEventListener("storage", onStorage); // cross-tab
      window.addEventListener(SAME_TAB_EVENT, onChange); // same-tab
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(SAME_TAB_EVENT, onChange);
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback((): string | null => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, [storageKey]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const overrides = useMemo<Record<string, boolean>>(() => {
    if (!raw) return EMPTY;
    try {
      return JSON.parse(raw) as Record<string, boolean>;
    } catch {
      return EMPTY;
    }
  }, [raw]);

  const checkedOf = (item: ChecklistItem) =>
    item.key in overrides ? overrides[item.key] : item.defaultDone;

  const toggle = (item: ChecklistItem) => {
    const next = { ...overrides, [item.key]: !checkedOf(item) };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* private mode / quota — nothing persists, but the UI stays usable */
    }
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  };

  return (
    <ul className="v3-checklist">
      {items.map((item, i) => {
        const checked = checkedOf(item);
        return (
          <li
            key={i}
            className={`v3-checklist__item${checked ? " is-done" : ""}`}
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            onClick={(e) => {
              // Don't toggle when a real link/button inside the row was clicked
              // (e.g. an inline footnote reference).
              if ((e.target as HTMLElement).closest("a, button")) return;
              toggle(item);
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggle(item);
              }
            }}
          >
            <span className="v3-checklist__marker" aria-hidden="true" />
            <span className="v3-checklist__body">{item.node}</span>
          </li>
        );
      })}
    </ul>
  );
}
