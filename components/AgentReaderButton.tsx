"use client";

import { useState } from "react";
import { T } from "./T";
import { useLang } from "./LangProvider";

/* "Feed to AI" entry on the book detail page. Copies a prompt that
   points the reader's Agent at /books/kimi/llms.md — the markdown
   rendering of the whole book. The agent fetches that URL and can
   summarize / answer questions / make notes for the user.

   Prompt design notes (learned the hard way): name the book EXACTLY
   and give a one-line abstract, so an agent that can't open the link
   still anchors on the right work — and tell it to admit a failed
   fetch instead of improvising from what it happens to know about
   "Kimi" the product. Without those rails, agents answer from their
   own training data about the product, not from this book. */
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
        ? `请阅读《Kimi · 从长文本到一套 agent 栈》—— Zhapar 写的一本讲透 Kimi 产品栈的书 (10 章, 中文): K3 与 K2.7-Code 模型、四模式、Agent 与 Agent Swarm、Deep Research、Kimi Code 与开放 API、五档会员的取舍。

第一步: 先抓取这份全书 markdown 再开始 —— ${mdUrl}
它是这本书的完整文本。如果抓取失败, 请直接告诉我「打不开链接」, 不要凭你对 Kimi 的了解编造本书内容; 我要的是这本书里写的判断, 不是印象里的 Kimi。

然后按需为我总结要点、回答具体问题、做读书笔记。引用时请保留作者署名 (Zhapar) 和章节链接。书的网页版 (含评论): ${bookUrl}`
        : `Please read "Kimi · From Long Context to an Agent Stack" — a book by Zhapar about the Kimi agent stack (10 chapters, in Chinese): the K3 and K2.7-Code models, the four modes, Agent and Agent Swarm, Deep Research, Kimi Code and the open API, and which of the five membership tiers is worth it.

Step one: fetch the full-book markdown before anything else — ${mdUrl}
It is the complete text. If you cannot open it, tell me plainly that the link failed — do NOT improvise from what you happen to know about Kimi the product. I want what's written in this book, not your general impressions.

Then summarize, answer specific questions, or make notes as I ask. Keep the author attribution (Zhapar) and chapter links when you quote. Web edition (with comments): ${bookUrl}`;

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
