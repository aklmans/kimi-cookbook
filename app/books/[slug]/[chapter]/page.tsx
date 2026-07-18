import type { Metadata } from "next";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import { ZHAPHAR_CODE_THEMES } from "@/lib/code-theme";
import rehypeCodeTitle from "@/lib/rehype-code-title";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { notFound } from "next/navigation";
import {
  getAllBooks,
  getBook,
  getChapter,
  chapterNumber,
  chapterPublishedAt,
  chapterModifiedAt,
} from "@/lib/books";
import { absoluteUrl } from "@/lib/site";
import { getMdxComponents, type Reference } from "@/components/mdx";
import { DraftNotice } from "@/components/mdx/DraftNotice";
import { extractChapterOutline } from "@/lib/chapter-outline";
import { ChapterShell } from "./ChapterShell";

/* Single-chapter reading page — source: chapter.html.
   Every book ships MDX chapters, so the route is fully static. */
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBooks().flatMap((b) =>
    b.chapters.map((c) => ({ slug: b.slug, chapter: c.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}): Promise<Metadata> {
  const { slug, chapter } = await params;
  const book = getBook(slug);
  const found = book && getChapter(book, chapter);
  if (!book || !found) return {};
  const { chapter: ch, index } = found;
  const description = ch.lede ?? book.description;
  const url = `/books/${slug}/${chapter}`;
  const publishedTime = chapterPublishedAt(book, ch, index);
  const modifiedTime = chapterModifiedAt(book, ch);
  return {
    title: { absolute: `${ch.title} · Kimi` },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: `${ch.title} · ${book.title}`,
      description,
      url: absoluteUrl(url),
      siteName: "Kimi · 从长文本到一套 agent 栈",
      publishedTime,
      modifiedTime,
      authors: [book.author],
    },
    twitter: {
      card: "summary_large_image",
      title: `${ch.title} · ${book.title}`,
      description,
      creator: "@ak_zhaphar",
    },
    other: { "article:modified_time": modifiedTime },
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const { slug, chapter: chapterSlug } = await params;
  const book = getBook(slug);
  if (!book) notFound();

  const found = getChapter(book, chapterSlug);
  if (!found) notFound();
  const { chapter, index } = found;

  // Draft chapter — skip MDX compilation and render the placeholder.
  if (chapter.draft) {
    return (
      <ChapterShell book={book} chapter={chapter} index={index}>
        <DraftNotice chapter={chapter} number={chapterNumber(index)} />
      </ChapterShell>
    );
  }

  const filePath = path.join(
    process.cwd(),
    "content",
    "books",
    slug,
    "chapters",
    `${chapterSlug}.mdx`,
  );
  let raw = "";
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    notFound();
  }

  const { data, content: body } = matter(raw);
  const references: Reference[] = Array.isArray(data.references)
    ? (data.references as Reference[])
    : [];
  const { body: bodyWithOutlineIds, outline } = extractChapterOutline(body);

  const { content } = await compileMDX({
    source: bodyWithOutlineIds,
    components: getMdxComponents({
      book,
      chapter,
      number: chapterNumber(index),
      references,
    }),
    options: {
      // The chapter MDX is trusted local content, so allow `{…}`
      // expressions — next-mdx-remote v6 strips them by default
      // (blockJS) as a guard for untrusted MDX. blockDangerousJS
      // stays on, so eval/Function/process remain blocked.
      blockJS: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          [
            rehypePrettyCode,
            {
              theme: ZHAPHAR_CODE_THEMES,
              keepBackground: false,
            },
          ],
          rehypeCodeTitle,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
        ],
      },
    },
  });

  return (
    <ChapterShell book={book} chapter={chapter} index={index} outline={outline}>
      {content}
    </ChapterShell>
  );
}
