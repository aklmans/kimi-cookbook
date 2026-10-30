import assert from "node:assert/strict";
import test from "node:test";
import { getChapterSource } from "../lib/chapter-content";

test("chapter source shares parsed frontmatter and body across consumers", async () => {
  const first = getChapterSource("kimi", "08-code");
  const second = getChapterSource("kimi", "08-code");

  assert.strictEqual(first, second);
  const source = await first;
  assert.match(source.body, /<SectionTitle/);
  assert.ok(source.references.length > 0);
  assert.ok(!source.body.startsWith("---"));
});

test("chapter source failures reject and are not cached", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const first = getChapterSource("kimi", "not-real");
    await assert.rejects(first, /ENOENT/);
    const retry = getChapterSource("kimi", "not-real");
    assert.notStrictEqual(retry, first);
    await assert.rejects(retry, /ENOENT/);
  } finally {
    console.error = originalError;
  }
});
