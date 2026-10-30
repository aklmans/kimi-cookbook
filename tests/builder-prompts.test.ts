import assert from "node:assert/strict";
import test from "node:test";
import { BUILDER_PROMPTS } from "../content/prompts/builders";
import { cleanMdx } from "../lib/llms-clean-mdx";
import { getLatestMonthlyIssue } from "../lib/monthly";

test("monthly artifacts use the canonical Builder prompts", () => {
  const artifacts = getLatestMonthlyIssue().artifacts;
  assert.equal(artifacts.length, BUILDER_PROMPTS.length);
  for (const prompt of BUILDER_PROMPTS) {
    const artifact = artifacts.find((item) => item.id === prompt.id);
    assert.ok(artifact);
    assert.equal(artifact.prompt, prompt.prompt);
    assert.equal(artifact.bestMode, prompt.bestMode);
  }
});

test("Agent markdown expands shared Builder prompts", () => {
  const output = cleanMdx(
    '<BuilderPrompt id="artifact-learn" />',
    { prompts: BUILDER_PROMPTS },
  );
  assert.match(output, /提示词 · Kimi · Thinking/);
  assert.match(output, /分布式共识算法 Paxos/);
  assert.doesNotMatch(output, /BuilderPrompt/);
});
