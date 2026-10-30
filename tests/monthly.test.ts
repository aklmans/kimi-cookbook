import assert from "node:assert/strict";
import test from "node:test";
import { getAllMonthlyIssues, getLatestMonthlyIssue } from "../lib/monthly";

test("monthly issues are sorted newest first with stable unique slugs", () => {
  const issues = getAllMonthlyIssues();
  assert.ok(issues.length > 0);
  assert.deepEqual(
    issues.map((issue) => issue.date),
    issues.map((issue) => issue.date).sort((a, b) => b.localeCompare(a)),
  );
  assert.equal(new Set(issues.map((issue) => issue.slug)).size, issues.length);
  for (const issue of issues) {
    assert.match(issue.slug, /^\d{4}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(`${issue.date}T00:00:00Z`)));
  }
  assert.strictEqual(getLatestMonthlyIssue(), issues[0]);
});
