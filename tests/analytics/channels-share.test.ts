import { test, before } from "node:test";
import assert from "node:assert/strict";
import { tempDbPath, openDb, seedEvents, eventRequest } from "./helpers";
import { queryAnalytics } from "@/lib/db";
import { POST } from "@/app/api/analytics/event/route";
import { __resetIngestRateLimit } from "@/lib/analytics-rate-limit";

process.env.DATABASE_URL = tempDbPath();

type Ov = {
  channels: { web: number; mp: number; agent: number; feed: number };
  share: {
    poster_download: number;
    qr_open: number;
    agent_prompt_copy: number;
    topChapters: { chapter_slug: string; count: number }[];
  };
  chapterStats?: unknown[];
};

const overview = async (range: number) =>
  (await queryAnalytics("overview", { range })) as unknown as Ov;

before(async () => {
  await queryAnalytics("overview", { range: 1 }); // create schema
  const db = openDb(process.env.DATABASE_URL!);
  seedEvents(db, [
    { type: "book_view", book_slug: "kimi" },
    { type: "chapter_view", book_slug: "kimi", chapter_slug: "01-intro" },
    { type: "mp_chapter_read", book_slug: "kimi", chapter_slug: "01-intro" },
    { type: "mp_chapter_read", book_slug: "kimi", chapter_slug: "02-stack" },
    { type: "agent_read", book_slug: "kimi", chapter_slug: "01-intro" },
    { type: "feed_read", book_slug: "feed" },
    { type: "poster_download", book_slug: "kimi", chapter_slug: "01-intro" },
    { type: "poster_download", book_slug: "kimi", chapter_slug: "01-intro" },
    { type: "qr_open", book_slug: "kimi", chapter_slug: "03-models" },
    { type: "agent_prompt_copy", book_slug: "kimi", chapter_slug: "03-models" },
  ]);
  db.close();
});

test("channels split web / mini program / agent / feed reads", async () => {
  const ov = await overview(30);
  assert.deepEqual(ov.channels, { web: 2, mp: 2, agent: 1, feed: 1 });
});

test("share actions counted, poster top chapters ranked", async () => {
  const ov = await overview(30);
  assert.equal(ov.share.poster_download, 2);
  assert.equal(ov.share.qr_open, 1);
  assert.equal(ov.share.agent_prompt_copy, 1);
  assert.equal(ov.share.topChapters[0]?.chapter_slug, "01-intro");
  assert.equal(ov.share.topChapters[0]?.count, 2);
});

test("single-book overview returns chapterStats without a filter", async () => {
  const ov = await overview(30);
  assert.ok(Array.isArray(ov.chapterStats));
});

test("event route accepts qr_open / agent_prompt_copy with a real chapter", async () => {
  __resetIngestRateLimit();
  const qr = await POST(
    eventRequest({
      type: "qr_open",
      bookSlug: "kimi",
      chapterSlug: "01-intro",
      sessionId: "sess-qr",
    }),
  );
  assert.equal(qr.status, 204);
  const copy = await POST(
    eventRequest({
      type: "agent_prompt_copy",
      bookSlug: "kimi",
      chapterSlug: "01-intro",
      sessionId: "sess-copy",
    }),
  );
  assert.equal(copy.status, 204);
});

test("event route rejects share actions without a chapter", async () => {
  __resetIngestRateLimit();
  const res = await POST(
    eventRequest({ type: "qr_open", bookSlug: "kimi", sessionId: "sess-no-ch" }),
  );
  assert.equal(res.status, 400);
});
