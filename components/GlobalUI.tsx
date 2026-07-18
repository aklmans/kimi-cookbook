"use client";

import Fuse from "fuse.js";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTheme } from "next-themes";
import { useLang } from "./LangProvider";
import { T } from "./T";
import { SearchIcon } from "./SearchIcon";
import { track } from "@/lib/analytics-client";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { BackToTop } from "./BackToTop";
import type { SearchItem } from "@/lib/searchIndex";

/* The assets/v3.js IIFE, ported. One client component
   holds the search palette, help overlay, the floating "?" hint, every
   keyboard shortcut, and the delegated click handlers for tabs / code
   copy / H3 anchors (v3.js used document-level delegation too). */

type Overlay = "closed" | "opening" | "open" | "closing";
type SearchLoadState = "idle" | "loading" | "ready" | "error";

const GROUP_LABEL: Record<SearchItem["type"], { zh: string; en: string }> = {
  book: { zh: "书目", en: "Books" },
  chapter: { zh: "章节", en: "Chapters" },
  page: { zh: "页面", en: "Pages" },
};
const GROUP_ORDER: SearchItem["type"][] = ["book", "chapter", "page"];
const SEARCH_DEBOUNCE_MS = 120;
// Longer than the results debounce: we only want the query the reader settled
// on, not each prefix they typed on the way there.
const SEARCH_TRACK_DEBOUNCE_MS = 1200;
const CHAPTER_OUTLINE_PREF_KEY = "kimi:chapter-outline";
const CHAPTER_OUTLINE_PINNED_VALUE = "pinned";
const CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS = "is-outline-hover-suppressed";
const CHAPTER_OUTLINE_HOVER_GRACE_MS = 220;

let canonLightboxReturn: HTMLElement | null = null;

function activateCarouselSlide(carousel: HTMLElement, index: number) {
  const slides = Array.from(
    carousel.querySelectorAll<HTMLElement>("[data-carousel-slide]"),
  );
  if (!slides.length) return;

  const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
  carousel.dataset.active = String(safeIndex);

  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === safeIndex;
    slide.classList.toggle("is-active", active);
    if (active) slide.removeAttribute("aria-hidden");
    else slide.setAttribute("aria-hidden", "true");
  });

  const counter = carousel.querySelector<HTMLElement>("[data-carousel-counter]");
  if (counter) {
    counter.textContent = `${String(safeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
  }

  const prev = carousel.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const next = carousel.querySelector<HTMLButtonElement>("[data-carousel-next]");
  if (prev) prev.disabled = safeIndex === 0;
  if (next) next.disabled = safeIndex === slides.length - 1;

  const lightbox = carousel.closest<HTMLElement>("#canon-lightbox");
  const activeTitle = slides[safeIndex]?.querySelector<HTMLElement>(".figcard-title");
  if (lightbox && activeTitle?.innerText.trim()) {
    lightbox.setAttribute("aria-label", activeTitle.innerText.trim());
  }
}

function moveCarousel(carousel: HTMLElement, to: number | "first" | "last") {
  const slides = carousel.querySelectorAll("[data-carousel-slide]").length;
  if (!slides) return;

  const current = Number(carousel.dataset.active ?? "0");
  const target =
    to === "first"
      ? 0
      : to === "last"
        ? slides - 1
        : Math.max(0, Math.min(slides - 1, current + to));

  activateCarouselSlide(carousel, target);
}

function setCanonBackgroundInert(on: boolean) {
  const lightbox = document.getElementById("canon-lightbox");
  if (!lightbox) return;

  let node: HTMLElement | null = lightbox;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && sibling instanceof HTMLElement) {
        sibling.toggleAttribute("inert", on);
      }
    }
    node = parent;
  }
}

function openCanonLightbox(trigger: HTMLElement) {
  const lightbox = document.getElementById("canon-lightbox");
  const album = trigger.closest<HTMLElement>(".album");
  const carousel = lightbox?.querySelector<HTMLElement>(".v3-carousel");
  const track = lightbox?.querySelector<HTMLElement>("[data-lightbox-track]");
  if (!lightbox || !album || !carousel || !track) return;

  const slides = Array.from(album.querySelectorAll<HTMLElement>(".figcard-slide"));
  if (!slides.length) return;

  track.replaceChildren(...slides.map((slide) => slide.cloneNode(true) as HTMLElement));
  lightbox
    .querySelector<HTMLElement>(".lb-controls")
    ?.classList.toggle("is-single", slides.length <= 1);
  carousel.dataset.active = "0";
  activateCarouselSlide(carousel, Number(album.dataset.active ?? "0"));

  canonLightboxReturn =
    document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  setCanonBackgroundInert(true);
  document.body.style.overflow = "hidden";

  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      lightbox
        .querySelector<HTMLButtonElement>("[data-lightbox-close]")
        ?.focus({ preventScroll: true });
    }, 0);
  });
}

function closeCanonLightbox() {
  const lightbox = document.getElementById("canon-lightbox");
  if (!lightbox?.classList.contains("is-open")) return;

  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  setCanonBackgroundInert(false);
  document.body.style.overflow = "";
  canonLightboxReturn?.focus({ preventScroll: true });
  canonLightboxReturn = null;
}

function cssToken(name: string, fallback: string) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

function canvasFont(size: number, family: "serif" | "mono" = "serif", weight = 400) {
  const stack =
    family === "mono"
      ? '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
      : '"Source Serif 4", "Noto Serif SC", Georgia, serif';
  return `${weight} ${size}px ${stack}`;
}

function wrappedTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
) {
  const value = text.replace(/\s+/g, " ").trim();
  const tokens = /\s/.test(value)
    ? value.split(/(\s+)/).filter(Boolean)
    : Array.from(value);
  const lines: string[] = [];
  let line = "";

  for (const token of tokens) {
    const next = line + token;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd());
      line = token.trimStart();
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }

  if (line && lines.length < maxLines) lines.push(line.trimEnd());
  if (lines.length === maxLines && tokens.join("").length > lines.join("").length) {
    let last = lines[lines.length - 1];
    while (last.length && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((lineText, index) => {
    context.fillText(lineText, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function canonSvgText(
  svg: SVGSVGElement,
  colors: {
    text: string;
    muted: string;
    subtle: string;
    accent: string;
    accentText: string;
  },
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `
    .fig-ink { fill: none; stroke: ${colors.text}; opacity: .64; }
    .fig-accent { fill: ${colors.accent}; stroke: ${colors.accent}; }
    .fig-accent-line { fill: none; stroke: ${colors.accent}; }
    .fig-spine { stroke: ${colors.accent}; }
    .fig-big { fill: ${colors.text}; font-family: "Source Serif 4", "Noto Serif SC", Georgia, serif; font-size: 30px; }
    .fig-label { fill: ${colors.muted}; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 20px; font-weight: 600; letter-spacing: .08em; }
    .fig-sub { fill: ${colors.subtle}; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 15px; letter-spacing: .06em; }
    .fig-ord { fill: ${colors.accentText}; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 15px; }
  `;
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

async function imageFromSvg(svgText: string) {
  const url = URL.createObjectURL(
    new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not render SVG"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string) {
  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.download = filename;
      link.href = blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      link.remove();
      if (blob) URL.revokeObjectURL(link.href);
      resolve();
    }, "image/png", 0.95);
  });
}

function canonFigureFilename(title: string) {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "canon-figure";
  return `${slug}.png`;
}

async function createCanonFigureCanvas(slide: HTMLElement) {
  await document.fonts?.ready.catch(() => undefined);

  const text = cssToken("--ink", "#1a1a1a");
  const muted = cssToken("--ink-2", "#3a3a3a");
  const subtle = cssToken("--ink-3", "#6b6b6b");
  const border = cssToken("--border", "#c0bfba");
  const accent = cssToken("--accent", "#1783ff");
  const bg = cssToken("--bg", "#fafafa");
  const title =
    slide.querySelector<HTMLElement>(".figcard-title")?.innerText.trim() ||
    "Canon figure";
  const eyebrow =
    slide.querySelector<HTMLElement>(".figcard-eyebrow")?.innerText.trim() ||
    "— CANON";
  const subtitle =
    slide.querySelector<HTMLElement>(".figcard-sub")?.innerText.trim() || "";
  const steps =
    slide
      .querySelector<HTMLElement>(".figcard-steps")
      ?.innerText.replace(/\s+/g, " ")
      .trim() || "";
  const svg = slide.querySelector<SVGSVGElement>(".figcard-art svg");
  if (!svg) throw new Error("No figure SVG");

  const width = 1400;
  const paddingX = 84;
  const contentWidth = width - paddingX * 2;
  const borderInset = 32;
  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  if (!measureContext) throw new Error("No canvas context");

  const viewBox = svg.viewBox.baseVal;
  const ratio =
    viewBox?.width && viewBox?.height
      ? viewBox.width / viewBox.height
      : 16 / 9;

  measureContext.font = canvasFont(58, "serif", 600);
  const titleLines = wrappedTextLines(measureContext, title, contentWidth, 3);
  measureContext.font = canvasFont(27, "serif", 400);
  const subtitleLines = subtitle
    ? wrappedTextLines(measureContext, subtitle, Math.min(contentWidth, 920), 3)
    : [];
  measureContext.font = canvasFont(17, "mono", 600);
  const stepLines = steps
    ? wrappedTextLines(measureContext, steps.toUpperCase(), Math.min(contentWidth, 900), 2)
    : [];

  const eyebrowY = 102;
  const titleY = 178;
  const titleLineHeight = 62;
  const subtitleY = titleY + titleLines.length * titleLineHeight + 28;
  const subtitleLineHeight = 40;
  const headerBottom =
    (subtitleLines.length
      ? subtitleY + subtitleLines.length * subtitleLineHeight
      : titleY + titleLines.length * titleLineHeight) + 56;
  const artWidth = contentWidth;
  const artHeight = artWidth / ratio;
  const artY = headerBottom;
  const footerTop = artY + artHeight + 58;
  const footerLineY = footerTop;
  const footerBrandY = footerTop + 48;
  const stepsStartY =
    footerTop + (stepLines.length > 1 ? 38 : 48);
  const height = Math.ceil(
    Math.max(footerBrandY, stepsStartY + stepLines.length * 24) + 52,
  );
  const scale = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No canvas context");
  context.scale(scale, scale);

  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = border;
  context.lineWidth = 0.5;
  context.strokeRect(borderInset, borderInset, width - borderInset * 2, height - borderInset * 2);

  context.fillStyle = subtle;
  context.font = canvasFont(18, "mono", 600);
  context.fillText(eyebrow.toUpperCase(), paddingX, eyebrowY);

  context.fillStyle = text;
  context.font = canvasFont(58, "serif", 600);
  const titleEnd = drawTextLines(context, titleLines, paddingX, titleY, titleLineHeight);
  const lastTitleLine = titleLines[titleLines.length - 1] ?? title;
  context.fillStyle = accent;
  context.beginPath();
  context.arc(
    paddingX + Math.min(context.measureText(lastTitleLine).width + 18, contentWidth - 8),
    titleEnd - 32,
    6,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (subtitleLines.length) {
    context.fillStyle = muted;
    context.font = canvasFont(27, "serif", 400);
    drawTextLines(context, subtitleLines, paddingX + 4, subtitleY, subtitleLineHeight);
  }

  const svgImage = await imageFromSvg(
    canonSvgText(svg, { text, muted, subtle, accent, accentText: accent }),
  );
  context.drawImage(svgImage, paddingX, artY, artWidth, artHeight);

  context.strokeStyle = border;
  context.beginPath();
  context.moveTo(paddingX, footerLineY);
  context.lineTo(width - paddingX, footerLineY);
  context.stroke();

  if (stepLines.length) {
    context.textAlign = "center";
    context.fillStyle = subtle;
    context.font = canvasFont(17, "mono", 600);
    stepLines.forEach((line, index) => {
      context.fillText(line, width / 2, stepsStartY + index * 24);
    });
  }
  context.textAlign = "left";
  context.fillStyle = muted;
  context.font = canvasFont(15, "mono", 600);
  context.fillText("KIMI · ZHAPAR", paddingX, footerBrandY);

  return { canvas, filename: canonFigureFilename(title) };
}

function currentDatasetLang() {
  return document.documentElement.dataset.lang === "en" ? "En" : "Zh";
}

function canonButtonLabel(button: HTMLElement, key: string, fallback: string) {
  return (
    button.dataset[`${key}${currentDatasetLang()}`] ??
    button.dataset[key] ??
    fallback
  );
}

async function exportCanonFigure(button: HTMLElement) {
  const slide = button.closest<HTMLElement>(".figcard-slide");
  if (!slide) return;

  const originalHtml = button.innerHTML;
  const originalText = button.textContent?.trim() || "Export image";
  const busy = canonButtonLabel(button, "labelBusy", originalText);
  const done = canonButtonLabel(button, "labelDone", originalText);
  const failed = canonButtonLabel(button, "labelFailed", originalText);
  const isButton = button instanceof HTMLButtonElement;

  button.textContent = busy;
  button.setAttribute("aria-busy", "true");
  if (isButton) button.disabled = true;

  try {
    const { canvas, filename } = await createCanonFigureCanvas(slide);
    await downloadCanvasImage(canvas, filename);
    button.textContent = done;
  } catch {
    button.textContent = failed;
  } finally {
    window.setTimeout(() => {
      button.innerHTML = originalHtml;
      button.removeAttribute("aria-busy");
      if (isButton) button.disabled = false;
    }, 1400);
  }
}

export function GlobalUI() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();

  const [index, setIndex] = useState<SearchItem[]>([]);
  const [searchLoadState, setSearchLoadState] =
    useState<SearchLoadState>("idle");
  const [search, setSearch] = useState<Overlay>("closed");
  const [help, setHelp] = useState<Overlay>("closed");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchCardRef = useRef<HTMLDivElement>(null);
  const searchTriggerRef = useRef<HTMLElement | null>(null);
  const searchIndexPromiseRef = useRef<Promise<void> | null>(null);

  const searchIsOpen = search === "open" || search === "opening";
  const helpIsOpen = help === "open" || help === "opening";

  const loadSearchIndex = useCallback(() => {
    if (searchLoadState === "ready") return Promise.resolve();
    if (searchIndexPromiseRef.current) return searchIndexPromiseRef.current;

    setSearchLoadState("loading");
    searchIndexPromiseRef.current = fetch("/search-index.json")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Search index returned ${response.status}`);
        }
        const nextIndex = (await response.json()) as SearchItem[];
        setIndex(nextIndex);
        setSearchLoadState("ready");
      })
      .catch((error) => {
        console.error("Failed to load search index", error);
        setSearchLoadState("error");
        // Allow retry after a cooldown — prevents rapid-fire refetches
        // while still letting the user retry later.
        setTimeout(() => {
          searchIndexPromiseRef.current = null;
        }, 3000);
      });
    return searchIndexPromiseRef.current;
  }, [searchLoadState]);

  /* ---- search results (fuse.js) ---- */
  const fuse = useMemo(
    () =>
      new Fuse<SearchItem>(index, {
        keys: [
          { name: "titleZh", weight: 0.42 },
          { name: "titleEn", weight: 0.42 },
          { name: "href", weight: 0.28 },
          { name: "meta", weight: 0.18 },
          { name: "searchText", weight: 0.22 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [index],
  );
  const ordered = useMemo(() => {
    const q = debouncedQuery.trim();
    if (q) return fuse.search(q).map((r) => r.item);
    return GROUP_ORDER.flatMap((t) => index.filter((m) => m.type === t));
  }, [debouncedQuery, fuse, index]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, query.trim() ? SEARCH_DEBOUNCE_MS : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  /* Track the *settled* search query, not every keystroke: fire ~1.2s after the
     reader stops typing (the cleanup cancels pending fires on each change), and
     only for queries worth recording. search_query is dedup-exempt client-side,
     so distinct refinements each count. */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      track({ type: "search_query", query: q });
    }, SEARCH_TRACK_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  /* ---- overlay open / close (two-step for the CSS opacity fade) ---- */
  const openSearch = useCallback(() => {
    searchTriggerRef.current = document.activeElement as HTMLElement | null;
    void loadSearchIndex();
    setQuery("");
    setDebouncedQuery("");
    setActiveIdx(0);
    setSearch((s) => (s === "closed" || s === "closing" ? "opening" : s));
  }, [loadSearchIndex]);
  const closeSearch = useCallback(() => {
    setSearch((s) => (s === "open" || s === "opening" ? "closing" : s));
  }, []);
  const openHelp = useCallback(() => {
    setHelp((s) => (s === "closed" || s === "closing" ? "opening" : s));
  }, []);
  const closeHelp = useCallback(() => {
    setHelp((s) => (s === "open" || s === "opening" ? "closing" : s));
  }, []);

  const syncChapterOutlineButtons = useCallback(() => {
    const pinned = document.body.classList.contains("is-outline-pinned");
    document.querySelectorAll<HTMLElement>("[data-outline-pin]").forEach((button) => {
      button.setAttribute("aria-pressed", String(pinned));
      const label = pinned ? button.dataset.unpinLabel : button.dataset.pinLabel;
      if (label) {
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
      }
    });
  }, []);

  const focusChapterOutlinePanel = useCallback(() => {
    document
      .querySelector<HTMLElement>("[data-chapter-outline-panel]")
      ?.querySelector<HTMLElement>("a[href]")
      ?.focus({ preventScroll: true });
  }, []);

  const toggleChapterOutlinePin = useCallback(() => {
    if (!document.querySelector("[data-chapter-outline-panel]")) return false;
    const wide = window.matchMedia("(min-width: 1280px)").matches;
    if (!wide) return false;
    document.body.classList.remove(CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS);
    const nextPinned = !document.body.classList.contains("is-outline-pinned");
    document.body.classList.toggle("is-outline-pinned", nextPinned);
    if (nextPinned) document.body.classList.remove("is-outline-open");
    window.localStorage.setItem(
      CHAPTER_OUTLINE_PREF_KEY,
      nextPinned ? CHAPTER_OUTLINE_PINNED_VALUE : "hidden",
    );
    syncChapterOutlineButtons();
    return true;
  }, [syncChapterOutlineButtons]);

  const toggleChapterOutline = useCallback(() => {
    if (!document.querySelector("[data-chapter-outline-panel]")) return false;
    document.body.classList.remove(CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS);

    const wide = window.matchMedia("(min-width: 1280px)").matches;
    if (wide) {
      if (document.body.classList.contains("is-outline-pinned")) {
        window.requestAnimationFrame(focusChapterOutlinePanel);
        syncChapterOutlineButtons();
        return true;
      }
      const nextOpen = !document.body.classList.contains("is-outline-open");
      document.body.classList.toggle("is-outline-open", nextOpen);
      syncChapterOutlineButtons();
      if (nextOpen) window.requestAnimationFrame(focusChapterOutlinePanel);
      return true;
    }

    document.body.classList.toggle("is-outline-open");
    syncChapterOutlineButtons();
    return true;
  }, [focusChapterOutlinePanel, syncChapterOutlineButtons]);

  const closeOpenChapterOutline = useCallback(() => {
    if (!document.body.classList.contains("is-outline-open")) return false;
    document.body.classList.remove("is-outline-open");
    syncChapterOutlineButtons();
    return true;
  }, [syncChapterOutlineButtons]);

  const closeChapterOutlineFully = useCallback(() => {
    if (!document.querySelector("[data-chapter-outline-panel]")) return false;
    document.body.classList.remove("is-outline-open", "is-outline-pinned");
    document.body.classList.add(CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS);
    window.localStorage.setItem(CHAPTER_OUTLINE_PREF_KEY, "hidden");
    syncChapterOutlineButtons();
    return true;
  }, [syncChapterOutlineButtons]);

  useEffect(() => {
    const saved = window.localStorage.getItem(CHAPTER_OUTLINE_PREF_KEY);
    document.body.classList.toggle(
      "is-outline-pinned",
      saved === CHAPTER_OUTLINE_PINNED_VALUE,
    );
    document.body.classList.remove("is-outline-hidden");
    document.body.classList.remove("is-outline-open");
    document.body.classList.remove(CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS);
    syncChapterOutlineButtons();
  }, [pathname, syncChapterOutlineButtons]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-chapter-outline]")) return;
      document.body.classList.remove(CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS);
    };
    document.addEventListener("pointermove", onPointerMove);
    return () => document.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-chapter-outline]");
    if (!shell) return;

    let closeTimer = 0;
    const wide = () => window.matchMedia("(min-width: 1280px)").matches;
    const pinned = () => document.body.classList.contains("is-outline-pinned");
    const suppressed = () =>
      document.body.classList.contains(CHAPTER_OUTLINE_HOVER_SUPPRESSED_CLASS);

    const openTemporary = () => {
      window.clearTimeout(closeTimer);
      if (!wide() || pinned() || suppressed()) return;
      document.body.classList.add("is-outline-open");
      syncChapterOutlineButtons();
    };

    const closeTemporary = () => {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        if (pinned()) return;
        if (shell.matches(":hover") || shell.matches(":focus-within")) return;
        document.body.classList.remove("is-outline-open");
        syncChapterOutlineButtons();
      }, CHAPTER_OUTLINE_HOVER_GRACE_MS);
    };

    shell.addEventListener("pointerenter", openTemporary);
    shell.addEventListener("pointerleave", closeTemporary);
    shell.addEventListener("focusin", openTemporary);
    shell.addEventListener("focusout", closeTemporary);

    return () => {
      window.clearTimeout(closeTimer);
      shell.removeEventListener("pointerenter", openTemporary);
      shell.removeEventListener("pointerleave", closeTemporary);
      shell.removeEventListener("focusin", openTemporary);
      shell.removeEventListener("focusout", closeTemporary);
    };
  }, [pathname, syncChapterOutlineButtons]);

  useEffect(() => {
    if (search === "opening") {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setSearch("open"));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    if (search === "closing") {
      const t = setTimeout(() => {
        setSearch("closed");
        searchTriggerRef.current?.focus?.();
      }, 180);
      return () => clearTimeout(t);
    }
    if (search === "open") inputRef.current?.focus();
  }, [search]);

  useEffect(() => {
    if (!searchIsOpen) return;
    const card = searchCardRef.current;
    if (!card) return;

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        card.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("hidden"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, [searchIsOpen]);

  useEffect(() => {
    if (help === "opening") {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setHelp("open"));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    if (help === "closing") {
      const t = setTimeout(() => setHelp("closed"), 180);
      return () => clearTimeout(t);
    }
  }, [help]);

  /* keep the active result scrolled into view */
  useEffect(() => {
    if (!searchIsOpen) return;
    resultsRef.current
      ?.querySelector(".v3-search__item.is-active")
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, searchIsOpen, ordered]);

  /* ---- navigation with the prototype's fade-out ---- */
  const navigate = useCallback(
    (href: string) => {
      document.querySelector(".v3-page")?.classList.add("is-fading");
      setTimeout(() => router.push(href), 150);
    },
    [router],
  );

  /* ---- keyboard dispatcher (latest-handler ref so it sees fresh state) ---- */
  const handleKey = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    const inField =
      !!el &&
      (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable);

    const canonLightbox = document.getElementById("canon-lightbox");
    if (canonLightbox?.classList.contains("is-open")) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCanonLightbox();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const carousel = canonLightbox.querySelector<HTMLElement>(".v3-carousel");
        if (carousel) {
          e.preventDefault();
          moveCarousel(carousel, e.key === "ArrowRight" ? 1 : -1);
        }
        return;
      }
      if (e.key === "Tab") {
        const focusable = Array.from(
          canonLightbox.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((node) => node.offsetParent !== null);
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          const active = document.activeElement;
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          } else if (active instanceof HTMLElement && !canonLightbox.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (searchIsOpen) closeSearch();
      else openSearch();
      return;
    }
    if (e.key === "Escape") {
      if (lightbox) {
        setLightbox(null);
        e.preventDefault();
      } else if (searchIsOpen) {
        closeSearch();
        e.preventDefault();
      } else if (helpIsOpen) {
        closeHelp();
        e.preventDefault();
      } else if (closeOpenChapterOutline()) {
        e.preventDefault();
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
        e.preventDefault();
      }
      return;
    }
    if (searchIsOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (ordered.length === 0) return;
        setActiveIdx((i) => {
          const d = e.key === "ArrowDown" ? 1 : -1;
          return (i + d + ordered.length) % ordered.length;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = ordered[activeIdx];
        if (item) {
          closeSearch();
          navigate(item.href);
        }
      }
      return;
    }
    if (helpIsOpen) return;

    const carousel = !inField
      ? (el?.closest<HTMLElement>(".v3-carousel") ?? null)
      : null;
    if (
      carousel &&
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === "Home") moveCarousel(carousel, "first");
      else if (e.key === "End") moveCarousel(carousel, "last");
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") moveCarousel(carousel, -1);
      else moveCarousel(carousel, 1);
      return;
    }

    // Tab-list keyboard: left/right/Home/End (roving tabindex pattern)
    if (el?.closest('[role="tab"]')) {
      const tab = el as HTMLElement;
      const tablist = tab.closest('[role="tablist"]');
      if (!tablist) return;
      const tabs = Array.from(
        tablist.querySelectorAll<HTMLElement>('[role="tab"]'),
      );
      const idx = tabs.indexOf(tab);
      let next: number;
      if (e.key === "ArrowLeft") next = idx - 1;
      else if (e.key === "ArrowRight") next = idx + 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      else return;
      e.preventDefault();
      if (next < 0 || next >= tabs.length) return;
      const nextTab = tabs[next];
      // Activate the tab
      tabs.forEach((t) => {
        const active = t === nextTab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", String(active));
        t.setAttribute("tabindex", active ? "0" : "-1");
      });
      const wrap = tablist.closest(".v3-tabs");
      const panelId = nextTab.getAttribute("data-tab");
      wrap
        ?.querySelectorAll<HTMLElement>(".v3-tabs__panel")
        .forEach((p) =>
          p.classList.toggle(
            "is-active",
            p.getAttribute("data-panel") === panelId,
          ),
        );
      nextTab.focus();
      return;
    }

    if (inField || e.altKey || e.metaKey || e.ctrlKey) return;

    if (e.key === "/" && !e.shiftKey) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      openHelp();
      return;
    }
    switch (e.key) {
      case "t":
      case "T":
        e.preventDefault();
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        break;
      case "l":
      case "L":
        e.preventDefault();
        toggleLang();
        break;
      case "f":
      case "F":
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        break;
      case "h":
      case "H":
        e.preventDefault();
        document.body.classList.toggle("is-clean");
        break;
      case "o":
      case "O":
        if (toggleChapterOutline()) e.preventDefault();
        break;
      case "ArrowLeft":
        if (document.body.dataset.prev) {
          e.preventDefault();
          navigate(document.body.dataset.prev);
        }
        break;
      case "ArrowRight":
        if (document.body.dataset.next) {
          e.preventDefault();
          navigate(document.body.dataset.next);
        }
        break;
      case "Home":
        if (document.body.dataset.first) {
          e.preventDefault();
          navigate(document.body.dataset.first);
        }
        break;
      case "End":
        if (document.body.dataset.last) {
          e.preventDefault();
          navigate(document.body.dataset.last);
        }
        break;
    }
  };
  const keyRef = useRef(handleKey);
  useEffect(() => {
    keyRef.current = handleKey;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  /* ---- delegated click handlers (tabs / code-copy / H3 anchor / search trigger) ---- */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      // Outbound-link click — observe only (no preventDefault / return) so the
      // browser still navigates and the other delegated handlers below still
      // run. External http(s) hosts only; fire-and-forget survives the unload.
      const outboundLink = el.closest<HTMLAnchorElement>("a[href]");
      if (outboundLink) {
        try {
          const url = new URL(outboundLink.href, window.location.href);
          if (
            (url.protocol === "http:" || url.protocol === "https:") &&
            url.host !== window.location.host
          ) {
            track({ type: "outbound_click", href: url.href });
          }
        } catch {
          /* non-URL href (mailto:, tel:, #hash, javascript:) — ignore */
        }
      }

      if (el.closest("[data-search-toggle]")) {
        openSearch();
        return;
      }

      if (el.closest("[data-outline-pin]")) {
        e.preventDefault();
        toggleChapterOutlinePin();
        return;
      }

      if (el.closest("[data-outline-close]")) {
        e.preventDefault();
        closeChapterOutlineFully();
        return;
      }

      if (el.closest("[data-outline-toggle]")) {
        e.preventDefault();
        toggleChapterOutline();
        return;
      }

      const outlineLink = el.closest<HTMLAnchorElement>(
        ".chapter-outline a[href^='#']",
      );
      if (outlineLink && document.body.classList.contains("is-outline-open")) {
        closeOpenChapterOutline();
        outlineLink.blur();
        return;
      }

      if (el.closest("[data-lightbox-close]")) {
        closeCanonLightbox();
        return;
      }

      const openCanon = document.getElementById("canon-lightbox");
      if (openCanon?.classList.contains("is-open") && el === openCanon) {
        closeCanonLightbox();
        return;
      }

      const figureOpen = el.closest<HTMLElement>("[data-lightbox-open]");
      if (figureOpen) {
        e.preventDefault();
        openCanonLightbox(figureOpen);
        return;
      }

      const canonExport = el.closest<HTMLElement>("[data-export-canon-figure]");
      if (canonExport) {
        e.preventDefault();
        void exportCanonFigure(canonExport);
        return;
      }

      const carouselNav = el.closest<HTMLElement>(
        "[data-carousel-prev], [data-carousel-next]",
      );
      if (carouselNav) {
        const carousel = carouselNav.closest<HTMLElement>(".v3-carousel");
        if (carousel) {
          e.preventDefault();
          moveCarousel(
            carousel,
            carouselNav.hasAttribute("data-carousel-next") ? 1 : -1,
          );
        }
        return;
      }

      const lightboxFigure = el.closest<HTMLElement>("[data-lightbox-src]");
      if (lightboxFigure) {
        const src = lightboxFigure.getAttribute("data-lightbox-src");
        if (src) setLightbox(src);
        return;
      }

      const accToggle = el.closest<HTMLElement>("[data-accordion-toggle]");
      if (accToggle) {
        const item = accToggle.closest(".v3-accordion__item");
        if (item) {
          const isOpen = item.classList.toggle("is-open");
          accToggle.setAttribute("aria-expanded", String(isOpen));
        }
        return;
      }

      const tab = el.closest<HTMLElement>("[data-tab]");
      if (tab) {
        const wrap = tab.closest(".v3-tabs");
        const id = tab.getAttribute("data-tab");
        if (wrap) {
          wrap.querySelectorAll<HTMLElement>(".v3-tab").forEach((t) => {
            const active = t === tab;
            t.classList.toggle("is-active", active);
            t.setAttribute("aria-selected", String(active));
            t.setAttribute("tabindex", active ? "0" : "-1");
          });
          wrap
            .querySelectorAll<HTMLElement>(".v3-tabs__panel")
            .forEach((p) =>
              p.classList.toggle(
                "is-active",
                p.getAttribute("data-panel") === id,
              ),
            );
        }
        return;
      }

      const copyBtn = el.closest<HTMLElement>("[data-copy]");
      if (copyBtn) {
        // Copy from the enclosing prompt/code frame, preferring the active tab
        // panel so the PromptBox 模板/示例 Copy follows the visible tab. Falls
        // back to the first pre/code for single-pane blocks (CodeBlock, etc.).
        const frame =
          copyBtn.closest<HTMLElement>(
            ".v3-promptbox__frame, .v3-codeblock__frame",
          ) ?? copyBtn.parentElement;
        const code =
          frame?.querySelector(".v3-tabs__panel.is-active pre") ??
          frame?.querySelector(".v3-tabs__panel.is-active code") ??
          frame?.querySelector("pre") ??
          frame?.querySelector("code");
        if (!code) return;
        const original = copyBtn.innerHTML;
        copyToClipboard((code as HTMLElement).innerText).then((ok) => {
          copyBtn.innerHTML = ok
            ? '<span lang="zh">已复制</span><span lang="en">Copied</span>'
            : '<span lang="zh">复制失败</span><span lang="en">Failed</span>';
          setTimeout(() => {
            copyBtn.innerHTML = original;
          }, 1200);
        });
        return;
      }

      /* Footnote anchor links — scroll target to viewport center */
      const fnLink = el.closest<HTMLAnchorElement>(".v3-fn-ref, .v3-refs__back");
      if (fnLink) {
        const hash = fnLink.getAttribute("href");
        if (hash?.startsWith("#")) {
          const target = document.getElementById(hash.slice(1));
          if (target) {
            e.preventDefault();
            target.scrollIntoView({
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "auto"
                : "smooth",
              block: "center",
            });
            history.replaceState(null, "", hash);
          }
        }
        return;
      }

      const anchor = el.closest<HTMLElement>(".v3-h3__anchor");
      if (anchor) {
        e.preventDefault();
        const h3 = anchor.closest(".v3-h3");
        if (!h3?.id) return;
        const url =
          window.location.origin + window.location.pathname + "#" + h3.id;
        copyToClipboard(url).then((ok) => {
          history.replaceState(null, "", "#" + h3.id);
          if (!ok) return;
          anchor.classList.add("is-copied");
          setTimeout(() => anchor.classList.remove("is-copied"), 1400);
        });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [
    closeChapterOutlineFully,
    closeOpenChapterOutline,
    openSearch,
    toggleChapterOutline,
    toggleChapterOutlinePin,
  ]);

  /* ---- reading progress bar ---- */
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("reading-progress");
      if (!el) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
      el.style.transform = `scaleX(${pct})`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const outlineLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        ".chapter-outline a[href^='#']",
      ),
    );
    const outlineMarkers = Array.from(
      document.querySelectorAll<HTMLElement>(".chapter-outline-marker"),
    );
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".ch-page :is(.v3-section[id], .v3-h3[id])",
      ),
    );
    if (!outlineLinks.length || !headings.length) return;

    const linksById = new Map(
      outlineLinks.map((link) => [decodeURIComponent(link.hash.slice(1)), link]),
    );
    const visibleHeadings = new Set<HTMLElement>();
    let frame = 0;

    const setActiveHeading = (id: string) => {
      outlineLinks.forEach((link) => {
        link.classList.toggle(
          "is-active",
          decodeURIComponent(link.hash.slice(1)) === id,
        );
      });
      outlineMarkers.forEach((marker) => {
        marker.classList.toggle("is-active", marker.dataset.target === id);
      });
    };

    const updateActiveHeading = () => {
      frame = 0;
      const candidates = [...visibleHeadings];
      const activeHeading =
        candidates.length > 0
          ? candidates.sort(
              (a, b) =>
                Math.abs(a.getBoundingClientRect().top - 112) -
                Math.abs(b.getBoundingClientRect().top - 112),
            )[0]
          : [...headings].reverse().find((heading) => {
              return heading.getBoundingClientRect().top <= 112;
            }) ?? headings[0];
      const activeId = activeHeading?.id;
      if (activeId && linksById.has(activeId)) setActiveHeading(activeId);
    };

    const scheduleActiveUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateActiveHeading);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!(entry.target instanceof HTMLElement)) return;
          if (entry.isIntersecting) visibleHeadings.add(entry.target);
          else visibleHeadings.delete(entry.target);
        });
        scheduleActiveUpdate();
      },
      { rootMargin: "-100px 0px -66%" },
    );

    headings.forEach((heading) => observer.observe(heading));
    window.addEventListener("scroll", scheduleActiveUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveUpdate);
    scheduleActiveUpdate();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", scheduleActiveUpdate);
      window.removeEventListener("resize", scheduleActiveUpdate);
    };
  }, [pathname]);

  /* ---- render: search results ---- */
  const hasQuery = query.trim().length > 0;
  const searchIsRefining =
    hasQuery && query.trim() !== debouncedQuery.trim();
  // Gate the localized placeholder on the panel being open. The search is
  // hidden (search === "closed") during SSR + hydration, so render the zh
  // default then — matching the server HTML — and switch to the reader's
  // language only once it opens (always post-hydration). This avoids a
  // hidden-input hydration mismatch without stranding an EN reader on a zh
  // placeholder (React reconciles the change on the open re-render).
  const placeholder =
    search !== "closed" && lang === "en"
      ? "Search books, chapters, keywords …"
      : "搜索作品、章节、关键词 …";
  const renderSearchItem = (item: SearchItem, idx: number) => (
    <Link
      key={item.href + idx}
      href={item.href}
      className={`v3-search__item${idx === activeIdx ? " is-active" : ""}`}
      onMouseEnter={() => setActiveIdx(idx)}
      onClick={closeSearch}
    >
      <span className="v3-search__item-title">
        <T zh={item.titleZh} en={item.titleEn} />
      </span>
      <span className="v3-search__item-meta">{item.meta}</span>
    </Link>
  );

  return (
    <>
      {/* ── Reading progress bar ── */}
      <div className="v3-progress" id="reading-progress" aria-hidden="true" />

      {/* ── Lightbox overlay ── */}
      {lightbox && (
        <div
          className="v3-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="图片放大 / Image zoom"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="v3-lightbox__img"
            src={lightbox}
            alt="放大的图片 / Zoomed figure"
          />
        </div>
      )}

      {/* ── Canon figure lightbox (filled by delegated DOM cloning) ── */}
      <div
        id="canon-lightbox"
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-hidden="true"
        aria-label="图解放大 / Figure zoom"
      >
        <button className="lb-close mono" type="button" data-lightbox-close>
          <T zh="关闭" en="Close" /> <span aria-hidden="true">×</span>
        </button>
        <figure className="lb-card v3-carousel" data-carousel data-active="0">
          <div className="figcard" data-lightbox-track />
          <div className="figcard-controls lb-controls">
            <button
              className="figcard-nav"
              type="button"
              data-carousel-prev
              aria-label="上一张 / Previous"
              disabled
            >
              <span aria-hidden="true">←</span>
            </button>
            <span className="figcard-counter mono" data-carousel-counter aria-live="polite">
              01 / 01
            </span>
            <button
              className="figcard-nav"
              type="button"
              data-carousel-next
              aria-label="下一张 / Next"
              disabled
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </figure>
      </div>

      {/* ── Global search (⌘K / /) ── */}
      <div
        className={`v3-search${search === "open" ? " is-open" : ""}`}
        hidden={search === "closed"}
      >
        <div className="v3-search__backdrop" onClick={closeSearch} />
        <div
          ref={searchCardRef}
          className="v3-search__card"
          role="dialog"
          aria-modal="true"
          aria-label="搜索 / Search"
        >
          <div className="v3-search__head">
            <span className="v3-search__icon">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              className="v3-search__input"
              type="search"
              autoComplete="off"
              spellCheck={false}
              aria-label="搜索关键词 / Search query"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                const nextQuery = e.target.value;
                setQuery(nextQuery);
                if (!nextQuery.trim()) setDebouncedQuery("");
                setActiveIdx(0);
              }}
            />
            <button
              className="v3-search__esc"
              type="button"
              onClick={closeSearch}
            >
              Esc
            </button>
          </div>
          <div className="v3-search__results" ref={resultsRef}>
            {searchLoadState === "loading" ? (
              <div className="v3-search__empty">
                <p className="v3-search__empty-title">
                  <em>
                    <T zh="正在准备搜索" en="Preparing search" />
                    <span className="stop">.</span>
                  </em>
                </p>
                <p className="v3-search__empty-sub">
                  <T
                    zh="首次打开需要载入索引"
                    en="Loading the index for the first search"
                  />
                </p>
              </div>
            ) : searchLoadState === "error" ? (
              <div className="v3-search__empty">
                <p className="v3-search__empty-title">
                  <em>
                    <T zh="搜索暂时不可用" en="Search is unavailable" />
                    <span className="stop">.</span>
                  </em>
                </p>
                <p className="v3-search__empty-sub">
                  <T zh="稍后再试一次" en="Try again in a moment" />
                </p>
              </div>
            ) : searchIsRefining ? (
              <div className="v3-search__empty">
                <p className="v3-search__empty-title">
                  <em>
                    <T zh="正在整理结果" en="Refining results" />
                    <span className="stop">.</span>
                  </em>
                </p>
                <p className="v3-search__empty-sub">
                  <T
                    zh="继续输入也没关系"
                    en="Keep typing if you need"
                  />
                </p>
              </div>
            ) : ordered.length === 0 ? (
              <div className="v3-search__empty">
                <p className="v3-search__empty-title">
                  <em>
                    <T zh="没有匹配结果" en="No matches" />
                    <span className="stop">.</span>
                  </em>
                </p>
                <p className="v3-search__empty-sub">
                  <T
                    zh="换个关键词，或按 Esc 回到页面"
                    en="Try another keyword, or press Esc to return"
                  />
                </p>
              </div>
            ) : hasQuery ? (
              <section className="v3-search__group">
                <p className="v3-search__group-label">
                  — <T zh="结果" en="Results" />
                </p>
                {ordered.map((item, idx) => renderSearchItem(item, idx))}
              </section>
            ) : (
              (() => {
                let running = 0;
                return GROUP_ORDER.map((type) => {
                  const items = ordered.filter((r) => r.type === type);
                  if (!items.length) return null;
                  const start = running;
                  running += items.length;
                  return (
                    <section className="v3-search__group" key={type}>
                      <p className="v3-search__group-label">
                        —{" "}
                        <T
                          zh={GROUP_LABEL[type].zh}
                          en={GROUP_LABEL[type].en}
                        />
                      </p>
                      {items.map((item, j) =>
                        renderSearchItem(item, start + j),
                      )}
                    </section>
                  );
                });
              })()
            )}
          </div>
          <div className="v3-search__foot">
            <span>
              <kbd>/</kbd>
              <kbd>⌘K</kbd>&nbsp;<T zh="搜索" en="Search" />
            </span>
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd>&nbsp;<T zh="选择" en="Navigate" />
            </span>
            <span>
              <kbd>↵</kbd>&nbsp;<T zh="打开" en="Open" />
            </span>
            <span>
              <kbd>Esc</kbd>&nbsp;<T zh="关闭" en="Close" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Keyboard help overlay ── */}
      <div
        className={`v3-help${help === "open" ? " is-open" : ""}`}
        hidden={help === "closed"}
      >
        <div className="v3-help__backdrop" onClick={closeHelp} />
        <div
          className="v3-help__card"
          role="dialog"
          aria-modal="true"
          aria-label="键盘快捷键 / Keyboard shortcuts"
        >
          <header className="v3-help__head">
            <p className="v3-help__label">— <T zh="键盘快捷键" en="Keyboard Shortcuts" /></p>
            <h2 className="v3-help__title">
              <T zh="快捷键" en="Shortcuts" />
              <span className="stop">.</span>
            </h2>
          </header>
          <dl className="v3-help__list">
            <dt>
              <kbd>/</kbd>
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </dt>
            <dd>打开搜索 · Search</dd>
            <dt>
              <kbd>→</kbd>
            </dt>
            <dd>下一章 · Next chapter</dd>
            <dt>
              <kbd>←</kbd>
            </dt>
            <dd>上一章 · Previous chapter</dd>
            <dt>
              <kbd>Home</kbd>
              <kbd>End</kbd>
            </dt>
            <dd>第一章 / 最后一章 · First / Last chapter</dd>
            <dt>
              <kbd>T</kbd>
            </dt>
            <dd>切换浅深主题 · Toggle theme</dd>
            <dt>
              <kbd>L</kbd>
            </dt>
            <dd>切换中 / 英文 · Language</dd>
            <dt>
              <kbd>F</kbd>
            </dt>
            <dd>全屏 / 退出全屏 · Toggle fullscreen</dd>
            <dt>
              <kbd>H</kbd>
            </dt>
            <dd>显示 / 隐藏控制按钮 · Show / hide controls</dd>
            <dt>
              <kbd>O</kbd>
            </dt>
            <dd>显示 / 隐藏章内目录 · Toggle outline</dd>
            <dt>
              <kbd>?</kbd>
            </dt>
            <dd>显示 / 隐藏帮助 · Show / hide help</dd>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>关闭帮助 / 退出全屏 · Close help / exit fullscreen</dd>
          </dl>
          <footer className="v3-help__foot">
            <span>
              <T
                zh={
                  <>
                    按 <kbd>?</kbd> 随时呼出 · <kbd>Esc</kbd> 关闭
                  </>
                }
                en={
                  <>
                    Press <kbd>?</kbd> any time · <kbd>Esc</kbd> to close
                  </>
                }
              />
            </span>
            <button type="button" onClick={closeHelp}>
              <T zh="关闭" en="Close" />
            </button>
          </footer>
        </div>
      </div>

      {/* ── Floating "?" hint ── */}
      <button
        type="button"
        className="v3-help-hint"
        aria-label="显示快捷键 / Show shortcuts"
        onClick={openHelp}
      >
        <kbd>?</kbd>
        <span>
          <T zh="快捷键" en="Shortcuts" />
        </span>
      </button>

      <BackToTop />
    </>
  );
}
