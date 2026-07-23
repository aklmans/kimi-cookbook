import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { getAllBooks, bookDateShort, chapterNumber } from "./books";

/* Build-time data collection for the ⌘K palette. */

export type SearchItem = {
  type: "book" | "chapter" | "page";
  titleZh: string;
  titleEn: string;
  href: string;
  meta: string;
  /** Curated keywords — title / titleShort / lede / posterSummary / H3s /
      reference bodies. Verbatim hits here outrank everything else. */
  shortText: string;
  /** Long prose haystack — tie-breaker signal only. */
  bodyText: string;
};

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractLocalizedProps(props: string): string {
  const parts: string[] = [];
  for (const attr of ["zh", "en"]) {
    const quoted = props.match(new RegExp(`${attr}="([^"]+)"`));
    if (quoted?.[1]) parts.push(quoted[1]);
  }
  return parts.join(" · ");
}

function cleanMdxText(text: string): string {
  return normalizeText(
    text
      .replace(/<T\s+([\s\S]*?)\/>/g, (_, props: string) =>
        extractLocalizedProps(props),
      )
      .replace(/<[^>]+>/g, " ")
      .replace(/[{}()[\]"'`*_#|>-]/g, " "),
  );
}

/** Extract every H3 heading from a markdown body. */
function extractH3s(md: string): string[] {
  const headings: string[] = [];
  for (const m of md.matchAll(/^### (.+)$/gm)) {
    const heading = cleanMdxText(m[1]);
    if (heading) headings.push(heading);
  }
  return headings;
}

/** Extract visible prose from common MDX component props and body text. */
function extractComponentText(md: string): string {
  const parts: string[] = [];

  for (const m of md.matchAll(/<T\s+([\s\S]*?)\/>/g)) {
    const props = m[1];
    for (const attr of ["zh", "en"]) {
      const quoted = props.match(new RegExp(`${attr}="([^"]+)"`));
      if (quoted?.[1]) parts.push(quoted[1]);
    }
  }

  const prose = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/<T\s+([\s\S]*?)\/>/g, " ");
  const cleanProse = cleanMdxText(prose);

  if (cleanProse) parts.push(cleanProse.slice(0, 900));
  return parts.join(" · ");
}

let cached: Promise<SearchItem[]> | null = null;

export function buildSearchIndex(): Promise<SearchItem[]> {
  if (!cached) cached = computeSearchIndex();
  return cached;
}

async function computeSearchIndex(): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  const root = process.cwd();

  for (const b of getAllBooks()) {
    items.push({
      type: "book",
      titleZh: b.title,
      titleEn: b.titleEn,
      href: `/books/${b.slug}`,
      meta: `${b.category} · ${b.chapters.length} Ch · ${bookDateShort(b.date)}`,
      // The book item exists for "kimi / 书" lookups — subtitle and
      // description would fuzzy-match nearly every concept query and
      // float the generic book page above the specific chapter.
      shortText: [b.title, b.titleEn, b.category, ...b.tags]
        .filter(Boolean)
        .join(" · "),
      bodyText: [b.subtitle, b.subtitleEn, b.description, b.descriptionEn]
        .filter(Boolean)
        .join(" · "),
    });
    for (const [i, c] of b.chapters.entries()) {
      // Skip draft chapters — searching and landing on a "draft in
      // progress" placeholder is a bad result. (Draft books are
      // already filtered upstream by getAllBooks.)
      if (c.draft) continue;
      const shortParts = [
        b.title,
        b.titleEn,
        c.title,
        c.titleEn,
        c.titleShort,
        c.lede,
        c.ledeEn,
        c.posterSummary,
      ];
      let bodyText = "";
      try {
        const raw = fs.readFileSync(
          path.join(root, "content", "books", b.slug, "chapters", `${c.slug}.mdx`),
          "utf-8",
        );
        // Frontmatter reference bodies are prime search anchors ("会员套餐
        // 价格", product names) — parse them out instead of stripping.
        const { data: frontmatter, content } = matter(raw);
        const refs = (frontmatter as { references?: { body?: string; bodyEn?: string }[] })
          .references;
        if (refs?.length) {
          shortParts.push(
            refs.map((r) => [r.body, r.bodyEn].filter(Boolean).join(" ")).join(" · "),
          );
        }
        const h3s = extractH3s(content);
        if (h3s.length) shortParts.push(h3s.join(" · "));
        bodyText = extractComponentText(content);
      } catch {
        /* chapter file missing — use meta-only fallback */
      }
      items.push({
        type: "chapter",
        titleZh: c.title,
        titleEn: c.titleEn,
        href: `/books/${b.slug}/${c.slug}`,
        meta: `${b.titleEn || b.title} · ${chapterNumber(i)} · ${c.readTime}`,
        shortText: shortParts.filter(Boolean).join(" · "),
        bodyText,
      });
    }
  }

  items.push(
    {
      type: "page",
      titleZh: "关于作者",
      titleEn: "About the Author",
      href: "/about",
      meta: "Zhaphar · Writer · Engineer",
      shortText: "关于作者 About Author Zhaphar Writer Engineer",
      bodyText: "",
    },
    {
      type: "page",
      titleZh: "RSS 订阅",
      titleEn: "RSS Feed",
      href: "/feed.xml",
      meta: "feed.xml · Updates",
      shortText: "RSS 订阅 Feed feed.xml Updates",
      bodyText: "",
    },
  );

  return items;
}
