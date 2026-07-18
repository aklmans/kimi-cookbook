import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyUserAgent,
  cleanVisitorId,
  visitorContextFromRequest,
} from "@/lib/analytics-visitor";

test("classifyUserAgent tags AI agents, search bots, feed readers, and humans", () => {
  assert.equal(classifyUserAgent("GPTBot/1.0").visitor_kind, "ai_agent");
  assert.equal(
    classifyUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)").visitor_kind,
    "search_bot",
  );
  assert.equal(classifyUserAgent("Feedly/1.0").visitor_kind, "feed_reader");
  assert.equal(classifyUserAgent("SomeRandomCrawler/1.0 bot").visitor_kind, "bot");
  const human = classifyUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 Safari/537.36",
  );
  assert.equal(human.visitor_kind, "human");
  assert.equal(human.device, "desktop");
  assert.equal(human.browser, "Chrome");
  assert.equal(human.os, "macOS");
});

test("non-human UAs are not fingerprinted into device/browser/os", () => {
  const bot = classifyUserAgent("GPTBot/1.0");
  assert.equal(bot.device, "bot");
  assert.equal(bot.browser, "Bot");
});

test("classifyUserAgent falls back for a null UA", () => {
  assert.equal(classifyUserAgent(null).visitor_kind, "unknown");
  assert.equal(
    classifyUserAgent(null, { fallbackKind: "feed_reader" }).visitor_kind,
    "feed_reader",
  );
});

test("cleanVisitorId trims and caps at 128 chars", () => {
  assert.equal(cleanVisitorId("  abc  "), "abc");
  assert.equal(cleanVisitorId(""), null);
  assert.equal(cleanVisitorId(null), null);
  assert.equal(cleanVisitorId("x".repeat(200))!.length, 128);
});

test("visitorContextFromRequest reads geo from platform headers, never IP", () => {
  const req = new Request("http://localhost/", {
    headers: {
      "user-agent": "Mozilla/5.0 Chrome/120 Safari/537.36",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
    },
  });
  const ctx = visitorContextFromRequest(req, { visitorId: "vid-1" });
  assert.equal(ctx.visitor_id, "vid-1");
  assert.equal(ctx.country, "US");
  assert.equal(ctx.region, "CA");
  assert.equal(ctx.visitor_kind, "human");
});
