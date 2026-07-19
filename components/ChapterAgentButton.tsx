"use client";

import { useState } from "react";
import { T } from "./T";
import { useLang } from "./LangProvider";

/* Per-chapter "Feed to AI" entry, mounted at the end of every chapter
   (ChapterShell). Copies the chapter-scoped prompt: exact chapter
   identity + its own per-chapter markdown endpoint (focused fetch),
   anti-improvisation rail, whole-book llms.md as fallback context.
   Mirrors the Mini Program's 分享给 AI. */
export function ChapterAgentButton({
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

  const handleCopy = async () => {
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
    <div className="ch-agent">
      <button
        className="book-detail__btn ch-agent__btn"
        type="button"
        onClick={handleCopy}
      >
        {status === "copied" ? (
          <T zh="已复制 ✓" en="Copied ✓" />
        ) : status === "error" ? (
          <T zh="复制失败" en="Copy failed" />
        ) : (
          <T zh="让 Agent 读本章 ↗" en="Feed this chapter to AI ↗" />
        )}
      </button>
      <span className="ch-agent__hint">
        <T
          zh="复制一段提示词, 把本章交给你的 AI 助手"
          en="Copy a prompt that hands this chapter to your AI"
        />
      </span>
    </div>
  );
}
