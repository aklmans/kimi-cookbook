import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import {
  getAllBooks,
  getBook,
  getChapter,
  bookDateShort,
  chapterNumber,
} from "@/lib/books";
import { absoluteUrl } from "@/lib/site";
import { trackAgentRead } from "@/lib/analytics-server";
import { cleanMdx } from "@/lib/llms-clean-mdx";

/* Per-chapter markdown view for AI agents.
   `/books/<slug>/<chapter>/llms.md` serves exactly one chapter as clean
   markdown — the focused fetch target for chapter-scoped agent prompts
   (the whole-book mirror stays at /books/<slug>/llms.md). Same routing
   model as the rest of the site: dynamicParams=false +
   generateStaticParams over published chapters. */

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().flatMap((b) =>
    b.chapters.map((c) => ({ slug: b.slug, chapter: c.slug })),
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; chapter: string }> },
) {
  const { slug, chapter: chapterSlug } = await params;
  const book = getBook(slug);
  const found = book && getChapter(book, chapterSlug);
  if (!book || !found) notFound();
  const { chapter, index } = found;

  trackAgentRead(slug, req.headers.get("user-agent"), chapterSlug);

  const number = chapterNumber(index);
  const bookUrl = absoluteUrl(`/books/${slug}`);
  const chapterUrl = `${bookUrl}/${chapterSlug}`;
  const prev = index > 0 ? book.chapters[index - 1] : null;
  const next =
    index < book.chapters.length - 1 ? book.chapters[index + 1] : null;

  const lines: string[] = [];
  lines.push(`# ${chapter.title} · ${book.title}`);
  lines.push("");
  lines.push(
    `**作者** ${book.author} · **章节** ${number} / ${String(book.chapters.length).padStart(2, "0")} · **首发** ${bookDateShort(book.date)} · **语言** 中文`,
  );
  lines.push(`**原文** ${chapterUrl}`);
  lines.push(`**全书 markdown** ${bookUrl}/llms.md`);
  if (prev) lines.push(`**上一章** ${bookUrl}/${prev.slug}/llms.md`);
  if (next) lines.push(`**下一章** ${bookUrl}/${next.slug}/llms.md`);
  lines.push("");
  lines.push(
    `> 本章由 ${book.author} 撰写, 于 kimi.read.wiki 完整免费阅读。允许 AI 摘读、引用、问答; 转载请保留作者署名与原文链接 (CC BY-NC-SA 4.0, ${absoluteUrl("/license")})。`,
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  if (chapter.lede) {
    lines.push(`> ${chapter.lede}`);
    lines.push("");
  }

  if (chapter.draft) {
    lines.push("(草稿: 本章节正文还在撰写中。)");
    lines.push("");
  } else {
    const filePath = path.join(
      process.cwd(),
      "content",
      "books",
      slug,
      "chapters",
      `${chapterSlug}.mdx`,
    );
    let raw: string;
    try {
      raw = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      console.error(`[llms] Failed to read ${slug}/${chapterSlug}`, error);
      throw error;
    }
    const { data: fm, content: body } = matter(raw);
    const cleaned = cleanMdx(body);
    if (cleaned) {
      lines.push(cleaned);
      lines.push("");
    }

    const refs = Array.isArray(fm.references) ? fm.references : [];
    if (refs.length > 0) {
      lines.push("## 引用与参考");
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
  lines.push(
    `*${chapter.title} · ${book.title} · ${book.author} 著 · CC BY-NC-SA 4.0 · ${chapterUrl}*`,
  );
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Location": `${chapterUrl}/llms.md`,
      "Cache-Control": "no-store",
    },
  });
}
