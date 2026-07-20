"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "@/components/T";
import { useLang } from "@/components/LangProvider";
import { absoluteUrl } from "@/lib/site";
import { track } from "@/lib/analytics-client";

/* Chapter-level reading-aids bar, mounted at the foot of the chapter
   <Cover /> (after the byline, before the rule) — the tools a reader
   should see BEFORE reading, not after: in-chapter contents (reuses the
   ChapterOutline rail via GlobalUI's delegated `o` handler), the
   chapter's llms.md, the chapter-scoped AI prompt (copies to
   clipboard), a QR popover for moving the chapter to a phone, and the
   share poster. Shape follows the sister project's article assistant:
   frame-less mono uppercase actions with accent hairline icons. */

const ICON_TOC = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <path d="M2 3.5h10M2 7h10M2 10.5h6" />
  </svg>
);
const ICON_MD = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 1.5h5l2 2v9h-7z" />
    <path d="M8.5 1.5v2h2" />
    <path d="M5.5 7h3M5.5 9.5h3" />
  </svg>
);
const ICON_AI = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 1.8l1.1 3.4 3.4 1.1-3.4 1.1L7 10.8 5.9 7.4 2.5 6.3l3.4-1.1z" />
  </svg>
);
const ICON_QR = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1.8" y="1.8" width="4" height="4" />
    <rect x="8.2" y="1.8" width="4" height="4" />
    <rect x="1.8" y="8.2" width="4" height="4" />
    <path d="M8.2 8.2h1.6v1.6H8.2zM10.6 10.6h1.6v1.6h-1.6zM8.2 12.2v-0.8M12.2 8.2v0.8" />
  </svg>
);
const ICON_POSTER = (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1.8" y="1.8" width="10.4" height="10.4" />
    <path d="M1.8 9.8l3-3 2.4 2.4 2-2 3 3" />
    <circle cx="5" cy="4.8" r="0.9" />
  </svg>
);

export function ChapterActions({
  bookSlug,
  bookTitle,
  number,
  chapterSlug,
  chapterTitle,
  lede,
}: {
  bookSlug: string;
  bookTitle: string;
  number: string;
  chapterSlug: string;
  chapterTitle: string;
  lede?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [qrOpen, setQrOpen] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();

  /* Track the QR popover opening (hover or click). track() dedups per
     page session, so repeated hovers count once. */
  useEffect(() => {
    if (qrOpen) track({ type: "qr_open", bookSlug, chapterSlug });
  }, [qrOpen, bookSlug, chapterSlug]);

  /* Close the QR popover on outside pointer-down or Escape. Registered
     only while open so the bar costs zero listeners when idle. */
  useEffect(() => {
    if (!qrOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!qrWrapRef.current?.contains(event.target as Node)) {
        setQrOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [qrOpen]);

  /* The outline rail + its toggle live in GlobalUI's delegated keyboard
     handler (`o`, registered on document). Dispatching the same key event
     keeps one owner of the panel state instead of duplicating the toggle
     logic here. Dispatched on document.body (a real element — document
     itself has no .closest()) and WITH bubbles:true so it actually
     reaches the document-level listener. */
  const toggleOutline = () => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "o", bubbles: true }),
    );
  };

  const copyPrompt = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const chapterMdUrl = `${origin}/books/${bookSlug}/${chapterSlug}/llms.md`;
    const bookMdUrl = `${origin}/books/${bookSlug}/llms.md`;
    const chapterUrl = `${origin}/books/${bookSlug}/${chapterSlug}`;
    const prompt =
      lang === "zh"
        ? `请阅读《${bookTitle}》第 ${number} 章「${chapterTitle}」—— Zhaphar 写的这本书讲透 Kimi 产品栈 (10 章, 中文)。${
            lede ? `这一章: ${lede}` : ""
          }

第一步: 先抓取本章的完整 markdown 再开始 —— ${chapterMdUrl}
抓取失败就直接告诉我「打不开链接」, 不要凭你对 Kimi 的了解编造; 我要的是这一章里写的判断, 不是印象里的 Kimi。

然后按需为我总结本章要点、回答具体问题、做笔记。需要更多上下文时说一声, 我把全书 markdown (${bookMdUrl}) 也给你。引用请保留作者署名 (Zhaphar) 和章节链接 (${chapterUrl})。`
        : `Please read chapter ${number}, "${chapterTitle}", of "${bookTitle}" by Zhaphar (10 chapters, in Chinese). ${
            lede ? `This chapter: ${lede}` : ""
          }

Step one: fetch this chapter's full markdown first — ${chapterMdUrl}
If the link fails, tell me plainly — do NOT improvise from what you happen to know about Kimi the product. I want what's written in this chapter, not general impressions.

Then summarize, answer questions, or make notes. If you need more context, ask and I'll give you the whole-book markdown (${bookMdUrl}). Keep the author attribution (Zhaphar) and the chapter link (${chapterUrl}) when you quote.`;

    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
      track({ type: "agent_prompt_copy", bookSlug, chapterSlug });
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  /* The QR encodes the CANONICAL chapter URL (a phone scanning it lands
     on the public site), so it comes from lib/site rather than
     window.location.origin — localhost previews would 400 against the
     qr.png route's site-host pin anyway. */
  const chapterPageUrl = absoluteUrl(`/books/${bookSlug}/${chapterSlug}`);
  const qrImgUrl = `/api/mp/qr.png?url=${encodeURIComponent(chapterPageUrl)}`;

  return (
    <div className="ch-actions" ref={qrWrapRef} aria-label="阅读辅助 / Reading aids">
      <button
        className="ch-actions__action"
        type="button"
        onClick={toggleOutline}
        aria-keyshortcuts="o"
      >
        {ICON_TOC}
        <span>
          <T zh="目录" en="Contents" />
        </span>
      </button>
      {/* QR lives with its popover in one hover zone: hover shows, leave
          hides, click pins open (touch has no hover), outside
          pointer-down / Escape hides. */}
      <span
        className="ch-actions__qr"
        onMouseEnter={() => setQrOpen(true)}
        onMouseLeave={() => setQrOpen(false)}
      >
        <button
          className="ch-actions__action"
          type="button"
          onClick={() => setQrOpen(true)}
          aria-expanded={qrOpen}
          aria-label="章节二维码 / Chapter QR code"
        >
          {ICON_QR}
          <span>
            <T zh="二维码" en="QR" />
          </span>
        </button>
        {qrOpen ? (
          <span className="ch-actions__qr-pop">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImgUrl}
              width={176}
              height={176}
              alt="章节二维码 / Chapter QR code"
            />
            <span className="ch-actions__qr-cap">
              <T zh="扫码在手机上阅读。" en="Scan to read on your phone." />
            </span>
          </span>
        ) : null}
      </span>
      {/* Plain <a>, not next/link: llms.md / poster.png are route handlers,
          and the router would prefetch their (nonexistent) RSC payload,
          leaving a pending fetch that never settles. The poster downloads
          straight away (same-origin `download`), no throwaway tab. */}
      <a
        className="ch-actions__action"
        href={`/books/${bookSlug}/${chapterSlug}/llms.md`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ICON_MD}
        <span>MD</span>
      </a>
      <a
        className="ch-actions__action"
        href={`/books/${bookSlug}/${chapterSlug}/poster.png`}
        download={`${bookSlug}-${chapterSlug}-poster.png`}
      >
        {ICON_POSTER}
        <span>
          <T zh="海报" en="Poster" />
        </span>
      </a>
      <button
        className="ch-actions__action"
        type="button"
        onClick={copyPrompt}
      >
        {ICON_AI}
        <span>
          {status === "copied" ? (
            <T zh="已复制 ✓" en="Copied ✓" />
          ) : status === "error" ? (
            <T zh="复制失败" en="Copy failed" />
          ) : (
            <T zh="让 Agent 读" en="Feed to AI" />
          )}
        </span>
      </button>
    </div>
  );
}
