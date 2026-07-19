"use client";

import { useState } from "react";
import { T } from "@/components/T";
import { useLang } from "@/components/LangProvider";

/* Chapter-level reading-aids bar, mounted at the foot of the chapter
   <Cover /> (after the byline, before the rule) — the tools a reader
   should see BEFORE reading, not after: in-chapter contents (reuses the
   ChapterOutline rail via GlobalUI's delegated `o` handler), the
   chapter's llms.md, and the chapter-scoped AI prompt (copies to
   clipboard). Shape follows the sister project's article assistant:
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
  const { lang } = useLang();

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
        ? `请阅读《${bookTitle}》第 ${number} 章「${chapterTitle}」—— Zhapar 写的这本书讲透 Kimi 产品栈 (10 章, 中文)。${
            lede ? `这一章: ${lede}` : ""
          }

第一步: 先抓取本章的完整 markdown 再开始 —— ${chapterMdUrl}
抓取失败就直接告诉我「打不开链接」, 不要凭你对 Kimi 的了解编造; 我要的是这一章里写的判断, 不是印象里的 Kimi。

然后按需为我总结本章要点、回答具体问题、做笔记。需要更多上下文时说一声, 我把全书 markdown (${bookMdUrl}) 也给你。引用请保留作者署名 (Zhapar) 和章节链接 (${chapterUrl})。`
        : `Please read chapter ${number}, "${chapterTitle}", of "${bookTitle}" by Zhapar (10 chapters, in Chinese). ${
            lede ? `This chapter: ${lede}` : ""
          }

Step one: fetch this chapter's full markdown first — ${chapterMdUrl}
If the link fails, tell me plainly — do NOT improvise from what you happen to know about Kimi the product. I want what's written in this chapter, not general impressions.

Then summarize, answer questions, or make notes. If you need more context, ask and I'll give you the whole-book markdown (${bookMdUrl}). Keep the author attribution (Zhapar) and the chapter link (${chapterUrl}) when you quote.`;

    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="ch-actions" aria-label="阅读辅助 / Reading aids">
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
      {/* Plain <a>, not next/link: llms.md is a route handler, and the
          router would prefetch its (nonexistent) RSC payload, leaving a
          pending fetch that never settles. */}
      <a
        className="ch-actions__action"
        href={`/books/${bookSlug}/${chapterSlug}/llms.md`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {ICON_MD}
        <span>MD</span>
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
