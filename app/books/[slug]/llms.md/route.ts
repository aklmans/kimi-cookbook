import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import {
  getAllBooks,
  getBook,
  bookDateShort,
  chapterNumber,
} from "@/lib/books";
import { absoluteUrl } from "@/lib/site";
import { trackAgentRead } from "@/lib/analytics-server";
import { cleanMdx } from "@/lib/llms-clean-mdx";
import type { BookMeta } from "@/lib/types";

/* Markdown view of a whole book, for AI agents.
   `/books/<slug>/llms.md` returns plain text/markdown — the
   "Feed to AI" button on the book detail page copies a prompt that
   points an Agent at this URL.

   Draft books 404 (same routing model as the rest of the site:
   dynamicParams=false + generateStaticParams over published books). */

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().map((b) => ({ slug: b.slug }));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const book = getBook(slug);
  if (!book) notFound();

  trackAgentRead(slug, req.headers.get("user-agent"));

  const body = await buildBookMarkdown(book);

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Location": `/books/${slug}/llms.md`,
      "Cache-Control": "no-store",
    },
  });
}

async function buildBookMarkdown(book: BookMeta): Promise<string> {
  const lines: string[] = [];
  const bookUrl = absoluteUrl(`/books/${book.slug}`);
  const langTag = book.language === "zh" ? "中文" : "中英双语";

  // ── Branded provenance header ──
  // First thing any scraped / forwarded copy carries: author, canonical
  // URL, license. Every downstream surface (other sites, AI summaries,
  // PDFs printed from this) keeps the path back home.
  lines.push(
    book.titleEn && book.titleEn !== book.title
      ? `# ${book.title} / ${book.titleEn}`
      : `# ${book.title}`,
  );
  lines.push("");
  lines.push(`**作者** ${book.author} · **首发** ${bookDateShort(book.date)} · **语言** ${langTag}`);
  lines.push(`**原文与最新版** ${bookUrl}`);
  lines.push("");
  lines.push(
    `> 本书由 Zhaphar 撰写, 于 kimi.read.wiki 完整免费阅读。允许 AI 摘读、引用、问答; 转载请保留作者署名与原文链接 (CC BY-NC-ND 4.0, ${absoluteUrl("/license")})。`,
  );
  lines.push("");
  /* Agent-fetch note — filled in at the END of the build, once the total
     byte size is known (the note itself sits near the top where a
     truncated fetch still sees it). */
  const noteIndex = lines.length;
  lines.push("");
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Book identity ──
  if (book.subtitle) {
    lines.push(`> ${book.subtitle}`);
    lines.push("");
  }
  lines.push(
    `${book.chapters.length} 章 · ${book.readMinutes} 分钟 · 标签: ${book.tags.join(" / ")}`,
  );
  lines.push("");
  lines.push(book.description);
  lines.push("");

  // ── Table of contents ──
  // Every line carries the chapter's own markdown + web URLs: an agent
  // holding even a truncated copy of this file can still fetch the book
  // chapter by chapter instead of guessing slugs.
  lines.push("## 目录");
  lines.push("");
  for (const [i, c] of book.chapters.entries()) {
    const draftMarker = c.draft ? "  (草稿)" : "";
    lines.push(
      `${chapterNumber(i)} · ${c.title}${draftMarker} — [md](${bookUrl}/${c.slug}/llms.md) · [web](${bookUrl}/${c.slug})`,
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Chapters ──
  for (const [i, c] of book.chapters.entries()) {
    const chapterUrl = `${bookUrl}/${c.slug}`;
    lines.push(`## 第 ${chapterNumber(i)} 章 · ${c.title}`);
    lines.push("");
    lines.push(`[原文](${chapterUrl}) · [评论](${chapterUrl}#discussion) · [本章 md](${chapterUrl}/llms.md)`);
    lines.push("");
    if (c.lede) {
      lines.push(`> ${c.lede}`);
      lines.push("");
    }

    if (c.draft) {
      lines.push("(草稿: 本章节正文还在撰写中。)");
      lines.push("");
    } else {
      const filePath = path.join(
        process.cwd(),
        "content",
        "books",
        book.slug,
        "chapters",
        `${c.slug}.mdx`,
      );
      let raw: string;
      try {
        raw = await fs.readFile(filePath, "utf-8");
      } catch (error) {
        console.error(`[llms] Failed to read ${book.slug}/${c.slug}`, error);
        throw error;
      }
      const { data: fm, content: body } = matter(raw);
      const cleaned = cleanMdx(body);
      if (cleaned) {
        lines.push(cleaned);
        lines.push("");
      }

      // References table at chapter end (if any in frontmatter).
      const refs = Array.isArray(fm.references) ? fm.references : [];
      if (refs.length > 0) {
        lines.push("### 引用与参考");
        lines.push("");
        for (const r of refs as Array<{
          id: number;
          body?: string;
          url?: string;
          urlLabel?: string;
        }>) {
          const id = String(r.id ?? "?").padStart(2, "0");
          const url = r.url ? `  (${r.urlLabel ?? r.url})` : "";
          lines.push(`${id} · ${r.body ?? ""}${url}`);
        }
        lines.push("");
      }
    }

    lines.push("---");
    lines.push("");
  }

  // ── Branded footer · engagement + support ──
  const lastChapter = book.chapters[book.chapters.length - 1];
  lines.push("## 读完了想说点什么?");
  lines.push("");
  lines.push(`- 完整版与最新更新: ${bookUrl}`);
  if (lastChapter) {
    lines.push(
      `- 章末评论 (一章一区): ${bookUrl}/${lastChapter.slug}#discussion`,
    );
  }
  lines.push(`- 关注作者: Twitter [@ak_zhaphar](https://x.com/ak_zhaphar) · GitHub [aklmans/kimi-cookbook](https://github.com/aklmans/kimi-cookbook) · Email hi@zhaphar.com`);
  lines.push(`- 觉得有用想支持作者: ${absoluteUrl("/about")}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`*Kimi · 从长文本到一套 agent 栈 · Zhaphar 著 · CC BY-NC-ND 4.0 · ${bookUrl}*`);
  lines.push("");

  // Patch the top-of-file agent note now that the total size is known.
  // Buffer.byteLength, not String.length: the note must match the BYTES
  // an agent's fetcher actually receives (CJK is 3 bytes/char in UTF-8
  // but 1 char in JS — String.length would under-report by ~half).
  const body = lines.join("\n");
  const totalKb = Math.max(1, Math.round(Buffer.byteLength(body, "utf8") / 1024));
  lines[noteIndex] =
    `> 给 AI 读者的抓取说明: 本文件是全书完整文本 (约 ${totalKb} KB, 共 ${book.chapters.length} 章)。若你的抓取工具把它截断了, 请按下方目录逐章抓取 —— 目录每行都带该章的 markdown 链接 (md, 每章约 5–25 KB); 站点级索引: ${absoluteUrl("/llms.txt")}。完整性自检: 全文最后一行是以「*${book.title}」开头的斜体署名行 —— 没看到它, 说明你手上的不是全文, 别把片段当全书。`;

  return lines.join("\n");
}

/* cleanMdx() and its helpers live in lib/llms-clean-mdx.ts so they can
   be behavior-tested directly (this route module pulls `@/`-aliased
   imports that the inline transpile loader in scripts/quality-check.mjs
   cannot resolve). The output is unchanged — only the location moved. */

