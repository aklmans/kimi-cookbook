import { getAllBooks, bookDateShort, chapterNumber } from "@/lib/books";
import { absoluteUrl } from "@/lib/site";
import { langLabel } from "@/lib/labels";

/* Site-level AI-readable index — the llms.txt convention.
   Lists every published book with its web + AI-markdown URLs so an
   agent can discover the whole library from one entry point.
   Draft books are excluded (getAllBooks filters them). */

export const dynamic = "force-static";

export function GET() {
  const books = getAllBooks();
  const lines: string[] = [];

  lines.push("# Kimi · 从长文本到一套 agent 栈");
  lines.push("");
  lines.push("> 《Kimi · 从长文本到一套 agent 栈》—— Zhaphar 写给已经付费 Kimi、却只用到一小部分的人：每块产品干什么、买哪档够用、什么时候回 frontier。完整章节，在线阅读，并允许 AI 摘读、引用与问答。");
  lines.push("> A book by Zhaphar about the Kimi agent stack — what each product surface does, which tier is enough, and when to go back to the frontier. Full chapters, free to read online; AI summarization, quoting, and Q&A welcome.");
  lines.push("");

  lines.push("## 站点入口 / Site entry");
  lines.push("");
  lines.push(`- 主页 / Home: ${absoluteUrl("/")}`);
  lines.push(`- 本书 / The Book: ${absoluteUrl("/books/kimi")}`);
  lines.push(`- RSS: ${absoluteUrl("/feed.xml")}`);
  lines.push(`- 关于 / About: ${absoluteUrl("/about")}`);
  lines.push(`- 授权 / License: ${absoluteUrl("/license")}`);
  lines.push(`- 本索引 / This index: ${absoluteUrl("/llms.txt")}`);
  lines.push("");

  lines.push("## 书目 / Books");
  lines.push("");
  for (const book of books) {
    const lang = langLabel(book.language);
    const title =
      book.titleEn && book.titleEn !== book.title
        ? `${book.title} / ${book.titleEn}`
        : book.title;
    lines.push(`### ${title}`);
    lines.push("");
    lines.push(`- 语言 / Language: ${lang.zh} · ${lang.en}`);
    lines.push(`- 首发 / Published: ${bookDateShort(book.date)}`);
    lines.push(`- ${book.chapters.length} 章 · ${book.readMinutes} 分钟 · ${book.tags.join(" / ")}`);
    if (book.description) {
      lines.push(`- ${book.description}`);
    }
    if (book.descriptionEn && book.descriptionEn !== book.description) {
      lines.push(`- ${book.descriptionEn}`);
    }
    lines.push(`- 阅读页 / Web: ${absoluteUrl(`/books/${book.slug}`)}`);
    lines.push(`- AI-readable markdown: ${absoluteUrl(`/books/${book.slug}/llms.md`)}`);
    /* Chapter-granularity markdown — the fallback for agents whose fetch
       budget truncates the whole-book file (and the only way to reach a
       chapter without guessing its slug). */
    lines.push(`- 逐章 markdown / Per-chapter markdown:`);
    for (const [i, c] of book.chapters.entries()) {
      const draftMarker = c.draft ? " (草稿)" : "";
      lines.push(
        `  - ${chapterNumber(i)} · ${c.title}${draftMarker}: ${absoluteUrl(`/books/${book.slug}/${c.slug}/llms.md`)}`,
      );
    }
    lines.push("");
  }

  lines.push("## 授权 / License");
  lines.push("");
  lines.push("本书内容遵循 CC BY-NC-SA 4.0: 允许免费阅读、AI 摘读、引用与转发, 须保留作者署名 (Zhaphar) 与原文链接; 衍生作品须署名并同协议共享; 禁止商业再发布。");
  lines.push("The book's content is licensed under CC BY-NC-SA 4.0 — free to read, quote, and feed to AI; derivatives must share alike with attribution; commercial reuse is not permitted.");
  lines.push(`License: ${absoluteUrl("/license")}`);
  lines.push("");

  lines.push(`Kimi · 从长文本到一套 agent 栈 · ${absoluteUrl("/")}`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
