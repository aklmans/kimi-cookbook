export type ChapterOutlineItem = {
  id: string;
  level: 2 | 3;
  titleZh: string;
  titleEn: string;
};

type LineTransform = {
  body: string;
  outline: ChapterOutlineItem[];
};

function cleanLabel(value: string): string {
  return value
    .replace(/\\n/g, " ")
    .replace(/<>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[{}()[\]"'`*_#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readBalancedProp(source: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return null;
}

function extractProp(source: string, name: string): string | null {
  const marker = `${name}=`;
  const index = source.indexOf(marker);
  if (index === -1) return null;

  const valueStart = index + marker.length;
  const first = source[valueStart];
  if (first === '"' || first === "'") {
    const end = source.indexOf(first, valueStart + 1);
    return end === -1 ? null : source.slice(valueStart + 1, end);
  }
  if (first === "{") return readBalancedProp(source, valueStart);
  return null;
}

function extractTProps(markup: string): string | null {
  const start = markup.indexOf("<T");
  if (start === -1) return null;

  let quote: string | null = null;
  let braceDepth = 0;
  const propsStart = start + 2;

  for (let i = propsStart; i < markup.length; i += 1) {
    const char = markup[i];
    const next = markup[i + 1];

    if (quote) {
      if (char === quote && markup[i - 1] !== "\\") quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") {
      braceDepth += 1;
      continue;
    }

    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }

    if (braceDepth === 0 && char === "/" && next === ">") {
      return markup.slice(propsStart, i);
    }
  }

  return null;
}

function extractLocalizedText(markup: string): Pick<
  ChapterOutlineItem,
  "titleZh" | "titleEn"
> {
  const props = extractTProps(markup);
  if (props) {
    const zh = cleanLabel(extractProp(props, "zh") ?? "");
    const en = cleanLabel(extractProp(props, "en") ?? "");
    return {
      titleZh: zh || en || cleanLabel(markup),
      titleEn: en || zh || cleanLabel(markup),
    };
  }

  const title = cleanLabel(markup);
  return { titleZh: title, titleEn: title };
}

function slugify(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sectionBase(number: string | null, fallback: string): string {
  if (!number) return slugify(fallback) || "section";
  return `section-${slugify(number) || number.toLowerCase()}`;
}

function uniqueId(base: string, seen: Map<string, number>): string {
  const id = base || "section";
  const count = seen.get(id) ?? 0;
  seen.set(id, count + 1);
  return count ? `${id}-${count}` : id;
}

function reserveId(id: string, seen: Map<string, number>): string {
  seen.set(id, (seen.get(id) ?? 0) + 1);
  return id;
}

function outlineItem(
  id: string,
  level: 2 | 3,
  markup: string,
): ChapterOutlineItem {
  const { titleZh, titleEn } = extractLocalizedText(markup);
  return { id, level, titleZh, titleEn };
}

function transformSectionTitle(
  line: string,
  seen: Map<string, number>,
  outline: ChapterOutlineItem[],
): string {
  return line.replace(
    /<SectionTitle\b([^>]*)>([\s\S]*?)<\/SectionTitle>/g,
    (full, attrs: string, inner: string) => {
      const existing = extractProp(attrs, "id");
      const number = extractProp(attrs, "number");
      const id = existing
        ? reserveId(existing, seen)
        : uniqueId(sectionBase(number, extractLocalizedText(inner).titleZh), seen);
      outline.push(outlineItem(id, 2, inner));
      if (existing) return full;
      return `<SectionTitle id="${id}"${attrs}>${inner}</SectionTitle>`;
    },
  );
}

function transformH3Component(
  line: string,
  seen: Map<string, number>,
  outline: ChapterOutlineItem[],
): string {
  return line.replace(
    /<H3\b([^>]*)>([\s\S]*?)<\/H3>/g,
    (full, attrs: string, inner: string) => {
      const existing = extractProp(attrs, "id");
      const label = extractLocalizedText(inner).titleZh;
      const id = existing
        ? reserveId(existing, seen)
        : uniqueId(slugify(label) || "section", seen);
      outline.push(outlineItem(id, 3, inner));
      if (existing) return full;
      return `<H3 id="${id}"${attrs}>${inner}</H3>`;
    },
  );
}

function transformMarkdownH3(
  line: string,
  seen: Map<string, number>,
  outline: ChapterOutlineItem[],
): string {
  const match = line.match(/^(\s*)###\s+(.+?)\s*$/);
  if (!match) return line;

  const [, indent, content] = match;
  const label = extractLocalizedText(content).titleZh;
  const id = uniqueId(slugify(label) || "section", seen);
  outline.push(outlineItem(id, 3, content));
  return `${indent}<H3 id="${id}">${content}</H3>`;
}

export function extractChapterOutline(source: string): LineTransform {
  const outline: ChapterOutlineItem[] = [];
  const seen = new Map<string, number>();
  let fence: { marker: "`" | "~"; length: number } | null = null;

  const lines = source.split("\n").map((line) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      const length = fenceMatch[1].length;
      if (!fence) fence = { marker, length };
      else if (fence.marker === marker && length >= fence.length) fence = null;
      return line;
    }
    if (fence) return line;

    const withSections = transformSectionTitle(line, seen, outline);
    const withH3 = transformH3Component(withSections, seen, outline);
    return transformMarkdownH3(withH3, seen, outline);
  });

  return { body: lines.join("\n"), outline };
}
