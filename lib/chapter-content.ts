import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export type ChapterReference = {
  id: number;
  body: string;
  bodyEn?: string;
  tip?: string;
  tipEn?: string;
  url?: string;
  urlLabel?: string;
};

export type ChapterSource = {
  raw: string;
  body: string;
  references: ChapterReference[];
};

const sourceCache = new Map<string, Promise<ChapterSource>>();

async function readChapterSource(
  bookSlug: string,
  chapterSlug: string,
): Promise<ChapterSource> {
  const filePath = path.join(
    process.cwd(),
    "content",
    "books",
    bookSlug,
    "chapters",
    `${chapterSlug}.mdx`,
  );
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    console.error(`[content] Failed to read ${bookSlug}/${chapterSlug}`, error);
    throw error;
  }
  const { data, content: body } = matter(raw);
  const references = Array.isArray(data.references)
    ? (data.references as ChapterReference[])
    : [];
  return { raw, body, references };
}

export function getChapterSource(
  bookSlug: string,
  chapterSlug: string,
): Promise<ChapterSource> {
  const key = `${bookSlug}/${chapterSlug}`;
  let source = sourceCache.get(key);
  if (!source) {
    source = readChapterSource(bookSlug, chapterSlug);
    sourceCache.set(key, source);
    source.catch(() => {
      if (sourceCache.get(key) === source) sourceCache.delete(key);
    });
  }
  return source;
}
