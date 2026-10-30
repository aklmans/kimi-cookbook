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
import { BUILDER_PROMPTS } from "@/content/prompts/builders";
import { getChapterSource } from "@/lib/chapter-content";
import { markdownResponse } from "@/lib/markdown-response";
import type { BookMeta, Chapter } from "@/lib/types";

/* Per-chapter markdown view for AI agents. Content is immutable within a
   release, so the cleaned document is cached per process; no-cache + ETag
   still lets agents revalidate without downloading an unchanged body. */

export const dynamicParams = false;

const chapterMarkdownCache = new Map<string, Promise<string>>();

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

  const key = `${slug}/${chapterSlug}`;
  let body = chapterMarkdownCache.get(key);
  if (!body) {
    body = buildChapterMarkdown(book, chapter, index);
    chapterMarkdownCache.set(key, body);
    body.catch(() => {
      if (chapterMarkdownCache.get(key) === body) {
        chapterMarkdownCache.delete(key);
      }
    });
  }

  return markdownResponse(
    req,
    await body,
    `/books/${slug}/${chapterSlug}/llms.md`,
  );
}

async function buildChapterMarkdown(
  book: BookMeta,
  chapter: Chapter,
  index: number,
): Promise<string> {
  const number = chapterNumber(index);
  const bookUrl = absoluteUrl(`/books/${book.slug}`);
  const chapterUrl = `${bookUrl}/${chapter.slug}`;
  const prev = index > 0 ? book.chapters[index - 1] : null;
  const next = index < book.chapters.length - 1
    ? book.chapters[index + 1]
    : null;

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
    const { body, references } = await getChapterSource(
      book.slug,
      chapter.slug,
    );
    const cleaned = cleanMdx(body, { prompts: BUILDER_PROMPTS });
    if (cleaned) {
      lines.push(cleaned);
      lines.push("");
    }

    if (references.length > 0) {
      lines.push("## 引用与参考");
      lines.push("");
      for (const reference of references) {
        const id = String(reference.id ?? "?").padStart(2, "0");
        const url = reference.url
          ? `  (${reference.urlLabel ?? reference.url})`
          : "";
        lines.push(`${id} · ${reference.body ?? ""}${url}`);
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
  return lines.join("\n");
}
