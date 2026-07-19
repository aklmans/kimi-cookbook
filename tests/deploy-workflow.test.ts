import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getBook } from "../lib/books";

const WORKFLOW_PATH = path.join(
  process.cwd(),
  ".github",
  "workflows",
  "deploy.yml",
);

function readWorkflow() {
  return fs.readFileSync(WORKFLOW_PATH, "utf8");
}

test("deployment verification uses a stable build marker, not feature DOM", () => {
  const workflow = readWorkflow();

  assert.match(workflow, /data-dpl-id/);
  assert.match(workflow, /health\.releaseVersion === expected/);
  assert.match(workflow, /health\.buildVersion === expected/);
  assert.match(workflow, /install -m 755 ops\/nginx-cache-doctor\.mjs/);
  assert.doesNotMatch(workflow, /ch-actions/);
});

test("the public chapter spot-check is registered in the book manifest", () => {
  // Restrict extraction to the pages=(...) assignment so a URL in a comment or
  // unrelated workflow step cannot make a stale spot-check look valid.
  const workflow = readWorkflow();
  const pagesAssignment = workflow.match(/pages=\(([\s\S]*?)\)/)?.[1];
  assert.ok(pagesAssignment, "workflow does not define public verification pages");

  const match = pagesAssignment.match(
    /\$site_url\/books\/([a-z0-9-]+)\/([a-z0-9-]+)/,
  );
  assert.ok(match, "workflow does not spot-check a chapter page");

  const [, bookSlug, chapterSlug] = match;
  const book = getBook(bookSlug);
  assert.ok(book, `workflow spot-checks unknown or draft book "${bookSlug}"`);
  assert.ok(
    book.chapters.some((chapter) => chapter.slug === chapterSlug),
    `workflow spot-checks chapter "${chapterSlug}" outside ${bookSlug}/meta.ts`,
  );
});
