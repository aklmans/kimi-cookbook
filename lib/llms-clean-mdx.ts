/* Light MDX → markdown cleanup for the /books/<slug>/llms.md agent route.
   Strips the v3 component scaffolding so an Agent sees a clean
   text/markdown stream, while keeping the text content.

   Extracted here from app/books/[slug]/llms.md/route.ts so it can be
   behavior-tested directly via scripts/quality-check.mjs (the route
   module pulls `@/`-aliased imports that the inline transpile loader
   can't resolve). This module is pure: no Node fs, no `@/` aliases, no
   React — only string transforms. */

export function cleanMdx(body: string): string {
  return tidyMarkdown(cleanMdxFragment(body));
}

function cleanMdxFragment(fragment: string): string {
  let text = fragment.replace(/\r\n/g, "\n");

  text = replaceSelfClosingComponent(text, "Cover", () => "");
  text = replaceSelfClosingComponent(text, "Footnote", (tag) => {
    const n = readProp(tag, "n")?.replace(/[{}]/g, "").trim();
    return n ? `[^${n}]` : "";
  });
  text = replaceSelfClosingComponent(text, "Divider", () => "\n---\n");
  for (const name of ["StopPunct", "References", "ChapterTOC"]) {
    text = replaceSelfClosingComponent(text, name, () => "");
  }

  text = replaceSelfClosingComponent(text, "T", (tag) =>
    propMarkdown(tag, "zh") ?? propMarkdown(tag, "en") ?? "",
  );
  text = replaceSelfClosingComponent(text, "Kicker", (tag) => {
    const body = propMarkdown(tag, "zh") ?? propMarkdown(tag, "en") ?? "";
    return body
      ? `\n${body.split("\n").map((line) => `> ${line}`).join("\n")}\n`
      : "";
  });
  text = replaceSelfClosingComponent(text, "Callout", (tag) => {
    const body = propMarkdown(tag, "zh") ?? propMarkdown(tag, "en") ?? "";
    return body ? `\n> ${body.replace(/\n+/g, "\n> ")}\n` : "";
  });
  text = replaceSelfClosingComponent(text, "Quote", (tag) => {
    const quote = propMarkdown(tag, "text") ?? "";
    const source = propMarkdown(tag, "source");
    if (!quote) return "";
    return `\n> ${quote}${source ? `\n> — ${source}` : ""}\n`;
  });
  text = replaceSelfClosingComponent(text, "PromptBox", promptBoxMarkdown);
  text = replacePairedComponent(text, "PromptBox", (tag, content) =>
    promptBoxMarkdown(tag, content),
  );
  text = replaceSelfClosingComponent(text, "Figure", (tag) => {
    const caption = propMarkdown(tag, "caption");
    const label = propMarkdown(tag, "label");
    const src = propMarkdown(tag, "src");
    const alt = propMarkdown(tag, "alt");
    const title = caption ?? label ?? alt;
    if (!title && !src) return "";
    return `\n${src ? `![${alt ?? title ?? "figure"}](${src})` : ""}${title ? `\n*${title}*` : ""}\n`;
  });
  text = replaceSelfClosingComponent(text, "LinkCard", (tag) => {
    const href = propMarkdown(tag, "href") ?? "";
    const title = propMarkdown(tag, "title") ?? href;
    const desc = propMarkdown(tag, "desc");
    return href ? `\n- [${title}](${href})${desc ? ` — ${desc}` : ""}\n` : "";
  });
  text = replaceSelfClosingComponent(text, "Di", (tag) => {
    const term = propMarkdown(tag, "term") ?? "";
    const desc = propMarkdown(tag, "desc") ?? "";
    return term || desc ? `\n- **${term}**${desc ? `: ${desc}` : ""}` : "";
  });
  for (const name of [
    "CanonAlbum",
    "KimiStackDiagram",
    "KimiModesDiagram",
    "KimiSwarmDiagram",
    "OpenAIProductMap",
    "OpenAIPickerLadder",
    "OpenAICodexLadder",
    "OpenAITierWalls",
  ]) {
    text = replaceSelfClosingComponent(text, name, (tag) => {
      const id = propMarkdown(tag, "id");
      return id ? `\n[图解: ${id}]\n` : "";
    });
  }
  for (const name of ["Stat", "Price", "Bar", "Milestone", "Cell", "GalleryItem", "ShowcaseCard"]) {
    text = replaceSelfClosingComponent(text, name, () => "");
  }

  text = replaceOpeningComponent(text, "SectionTitle", (tag) => {
    const number = propMarkdown(tag, "number");
    return `\n### ${number ? `${number} · ` : ""}`;
  }).replace(/<\/SectionTitle>/g, "\n");
  text = replaceOpeningComponent(text, "H3", () => "\n### ").replace(/<\/H3>/g, "\n");
  text = replaceOpeningComponent(text, "Step", (tag) => {
    const title = propMarkdown(tag, "title");
    return `\n- ${title ? `**${title}**: ` : ""}`;
  }).replace(/<\/Step>/g, "\n");
  text = replaceOpeningComponent(text, "Check", () => "\n- ").replace(/<\/Check>/g, "\n");
  text = replaceOpeningComponent(text, "Tab", (tag) => {
    const label = propMarkdown(tag, "label");
    return label ? `\n#### ${label}\n` : "\n";
  }).replace(/<\/Tab>/g, "\n");
  for (const name of ["Before", "After", "AccordionItem"]) {
    text = replaceOpeningComponent(text, name, (tag) => {
      const label = propMarkdown(tag, "label") ?? propMarkdown(tag, "title");
      return label ? `\n#### ${label}\n` : "\n";
    }).replace(new RegExp(`</${name}>`, "g"), "\n");
  }
  text = replaceOpeningComponent(text, "CodeBlock", (tag) => {
    const caption = propMarkdown(tag, "caption");
    const filename = propMarkdown(tag, "filename");
    const title = filename ? ` title="${filename.replaceAll('"', '\\"')}"` : "";
    return `\n${caption ? `_${caption}_\n` : ""}\`\`\`text${title}\n`;
  }).replace(/<\/CodeBlock>/g, "\n```\n");

  text = text
    .replace(/<C>([\s\S]*?)<\/C>/g, "`$1`")
    .replace(/<Kbd>([\s\S]*?)<\/Kbd>/g, "`$1`")
    .replace(/<figcaption(?:\s[^>]*)?>([\s\S]*?)<\/figcaption>/g, "\n*$1*\n")
    .replace(/<svg(?:\s[^>]*)?>[\s\S]*?<\/svg>/g, "\n[图解]\n")
    .replace(/<\/?(figure|div)(?:\s[^>]*)?>/g, "\n")
    .replace(/<Badge(?:\s[^>]*)?>([\s\S]*?)<\/Badge>/g, "$1")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/g, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/g, "*$2*")
    .replace(/\{\s*`([\s\S]*?)`\s*\}/g, "$1")
    .replace(/\{\s*"((?:\\.|[^"\\])*)"\s*\}/g, (_, value: string) =>
      decodeStringLiteral(`"${value}"`),
    )
    .replace(/\{\s*'((?:\\.|[^'\\])*)'\s*\}/g, (_, value: string) =>
      decodeStringLiteral(`'${value}'`),
    );

  for (const name of [
    "Steps",
    "Checklist",
    "Compare",
    "Tabs",
    "Accordion",
    "Dl",
    "Stats",
    "PriceTable",
    "Timeline",
    "Quadrant",
    "BarCompare",
    "Gallery",
    "Diagram",
  ]) {
    text = stripComponentTag(text, name);
  }

  return text
    .replace(/<\/>/g, "")
    .replace(/<>/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n");
}

type TagReplacement = (tag: string) => string;
type PairedReplacement = (tag: string, content: string) => string;

function replaceSelfClosingComponent(
  input: string,
  name: string,
  replacement: TagReplacement,
): string {
  return replaceComponentTag(input, name, replacement, true);
}

function replaceOpeningComponent(
  input: string,
  name: string,
  replacement: TagReplacement,
): string {
  return replaceComponentTag(input, name, replacement, false);
}

function replacePairedComponent(
  input: string,
  name: string,
  replacement: PairedReplacement,
): string {
  let output = "";
  let cursor = 0;
  const closeTag = `</${name}>`;
  while (cursor < input.length) {
    const start = input.indexOf(`<${name}`, cursor);
    if (start < 0) {
      output += input.slice(cursor);
      break;
    }
    const next = input[start + name.length + 1];
    if (next && /[A-Za-z0-9_-]/.test(next)) {
      output += input.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }
    const parsed = readTag(input, start);
    if (!parsed || parsed.selfClosing) {
      output += input.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }
    const closeStart = input.indexOf(closeTag, parsed.end);
    if (closeStart < 0) {
      output += input.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }
    output +=
      input.slice(cursor, start) +
      replacement(parsed.tag, input.slice(parsed.end, closeStart));
    cursor = closeStart + closeTag.length;
  }
  return output;
}

function replaceComponentTag(
  input: string,
  name: string,
  replacement: TagReplacement,
  selfClosingOnly: boolean,
): string {
  let output = "";
  let cursor = 0;
  while (cursor < input.length) {
    const start = input.indexOf(`<${name}`, cursor);
    if (start < 0) {
      output += input.slice(cursor);
      break;
    }
    const next = input[start + name.length + 1];
    if (next && /[A-Za-z0-9_-]/.test(next)) {
      output += input.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }
    const parsed = readTag(input, start);
    if (!parsed || (selfClosingOnly && !parsed.selfClosing) || (!selfClosingOnly && parsed.selfClosing)) {
      output += input.slice(cursor, start + 1);
      cursor = start + 1;
      continue;
    }
    output += input.slice(cursor, start) + replacement(parsed.tag);
    cursor = parsed.end;
  }
  return output;
}

function readTag(input: string, start: number): { tag: string; end: number; selfClosing: boolean } | null {
  let braceDepth = 0;
  let quote: '"' | "'" | "`" | null = null;
  for (let i = start + 1; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (shouldStartQuote(input, i, braceDepth)) {
      quote = char as '"' | "'" | "`";
      continue;
    }
    if (char === "{") braceDepth++;
    else if (char === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (char === ">" && braceDepth === 0) {
      const tag = input.slice(start, i + 1);
      return { tag, end: i + 1, selfClosing: tag.slice(-2) === "/>" };
    }
  }
  return null;
}

function readProp(tag: string, name: string): string | undefined {
  const prop = new RegExp(`(?:\\s|<)${escapeRegExp(name)}\\s*=`, "g");
  const match = prop.exec(tag);
  if (!match) return undefined;
  let cursor = match.index + match[0].length;
  while (/\s/.test(tag[cursor] ?? "")) cursor++;
  const first = tag[cursor];
  if (first === '"' || first === "'" || first === "`") {
    return readQuoted(tag, cursor);
  }
  if (first === "{") {
    return readBalanced(tag, cursor, "{", "}");
  }
  const end = tag.slice(cursor).search(/[\s>]/);
  return tag.slice(cursor, end < 0 ? undefined : cursor + end);
}

function readQuoted(input: string, start: number): string | undefined {
  const quote = input[start];
  for (let i = start + 1; i < input.length; i++) {
    if (input[i] === "\\") i++;
    else if (input[i] === quote) return input.slice(start, i + 1);
  }
  return undefined;
}

function readBalanced(
  input: string,
  start: number,
  open: string,
  close: string,
): string | undefined {
  let depth = 0;
  let quote: '"' | "'" | "`" | null = null;
  for (let i = start; i < input.length; i++) {
    const char = input[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (shouldStartQuote(input, i, depth)) {
      quote = char as '"' | "'" | "`";
      continue;
    }
    if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) return input.slice(start, i + 1);
    }
  }
  return undefined;
}

function shouldStartQuote(
  input: string,
  index: number,
  braceDepth: number,
): boolean {
  const char = input[index];
  if (char !== '"' && char !== "'" && char !== "`") return false;
  if (braceDepth === 0) return true;
  const prev = input.slice(0, index).match(/\S(?=\s*$)/)?.[0];
  return !prev || /[{[(=]/.test(prev);
}

function propMarkdown(tag: string, prop: string): string | undefined {
  const value = readProp(tag, prop);
  if (value === undefined) return undefined;
  return tidyMarkdown(markdownValue(value));
}

function markdownValue(raw: string): string {
  let value = raw.trim();
  if (value.startsWith("{") && value.endsWith("}")) {
    value = value.slice(1, -1).trim();
  }
  if (value.startsWith("<>") && value.endsWith("</>")) {
    value = value.slice(2, -3).trim();
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    return decodeStringLiteral(value);
  }
  return cleanMdxFragment(value);
}

function promptBoxMarkdown(tag: string, content?: string): string {
  const model = propMarkdown(tag, "model");
  const text =
    propMarkdown(tag, "text") ??
    (content ? tidyMarkdown(markdownChildValue(content)) : undefined);
  const example = propMarkdown(tag, "example");
  const parts: string[] = [];
  parts.push(`\n**提示词${model ? ` · ${model}` : ""}**`);
  if (text) parts.push(`\`\`\`text\n${text}\n\`\`\``);
  if (example) parts.push(`**示例**\n\n\`\`\`text\n${example}\n\`\`\``);
  return `${parts.join("\n\n")}\n`;
}

function markdownChildValue(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  return value.startsWith("{") && value.endsWith("}")
    ? markdownValue(value)
    : cleanMdxFragment(value);
}

function stripComponentTag(input: string, name: string): string {
  return input
    .replace(new RegExp(`<${name}(?:\\s[^>]*)?>`, "g"), "\n")
    .replace(new RegExp(`</${name}>`, "g"), "\n");
}

function decodeStringLiteral(value: string): string {
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  return value
    .slice(1, -1)
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\(["'`\\])/g, "$1");
}

function tidyMarkdown(text: string): string {
  return text
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
