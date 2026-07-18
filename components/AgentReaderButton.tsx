"use client";

import { useState } from "react";
import { T } from "./T";
import { useLang } from "./LangProvider";

/* "Feed to AI" entry on the book detail page. Copies a short prompt
   that points the reader's Agent at /books/<slug>/llms.md — the
   markdown rendering of the whole book. The agent fetches that URL
   and can summarize / answer questions / make notes for the user.

   Uses window.location.origin so the URL adapts to whatever host
   serves the page (localhost in dev, library.aklman.com in prod). */
export function AgentReaderButton({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const { lang } = useLang();

  const handleCopy = async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const mdUrl = `${origin}/books/${slug}/llms.md`;
    const bookUrl = `${origin}/books/${slug}`;
    const prompt =
      lang === "zh"
        ? `请帮我阅读 Zhapar 写的这本关于 Kimi 的书, 按需为我总结要点、回答具体问题、做读书笔记。引用时请保留作者署名和章节链接。

完整 markdown: ${mdUrl}
书的网页版 (含评论): ${bookUrl}`
        : `Please read this book about Kimi by Zhapar — I'll follow up with summary requests, specific questions, or note-making. When you quote from it, keep the author attribution and chapter links.

Full markdown: ${mdUrl}
Web version (with comments): ${bookUrl}`;

    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <button className="book-detail__btn" type="button" onClick={handleCopy}>
      {status === "copied" ? (
        <T zh="已复制 ✓" en="Copied ✓" />
      ) : status === "error" ? (
        <T zh="复制失败" en="Copy failed" />
      ) : (
        <T zh="让 Agent 读 ↗" en="Feed to AI ↗" />
      )}
    </button>
  );
}
