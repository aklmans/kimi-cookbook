import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchIndex } from "../lib/searchIndex";

test("chapter search keywords include component H3 headings", async () => {
  const items = await buildSearchIndex();
  const chapter = items.find(
    (item) => item.type === "chapter" && item.href === "/books/kimi/08-code",
  );

  assert.ok(chapter);
  assert.match(chapter.shortText, /Cline \/ Roo Code \/ Aider/);
  assert.match(chapter.shortText, /都有现成路径/);
});

test("monthly search results point to permanent issue URLs", async () => {
  const items = await buildSearchIndex();
  const issue = items.find(
    (item) => item.type === "page" && item.href === "/monthly/2026-09",
  );

  assert.ok(issue);
  assert.match(issue.meta, /最新/);
  assert.match(issue.shortText, /Builders/);
});
