import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkIngestRateLimit,
  __resetIngestRateLimit,
  MAX_INGEST_BODY_BYTES,
  INGEST_RATE_LIMIT,
} from "@/lib/analytics-rate-limit";

test("allows exactly maxPerWindow requests, then blocks", () => {
  __resetIngestRateLimit();
  const key = "k";
  let allowed = 0;
  for (let i = 0; i < INGEST_RATE_LIMIT.maxPerWindow; i++) {
    if (checkIngestRateLimit(key, 1000).ok) allowed++;
  }
  assert.equal(allowed, INGEST_RATE_LIMIT.maxPerWindow);

  const over = checkIngestRateLimit(key, 1000);
  assert.equal(over.ok, false);
  assert.ok(over.retryAfterSeconds > 0, "blocked result carries a Retry-After");
});

test("keys are independent", () => {
  __resetIngestRateLimit();
  for (let i = 0; i < INGEST_RATE_LIMIT.maxPerWindow; i++) {
    checkIngestRateLimit("a", 1000);
  }
  assert.equal(checkIngestRateLimit("a", 1000).ok, false);
  assert.equal(checkIngestRateLimit("b", 1000).ok, true);
});

test("window resets after windowMs", () => {
  __resetIngestRateLimit();
  for (let i = 0; i < INGEST_RATE_LIMIT.maxPerWindow; i++) {
    checkIngestRateLimit("k", 1000);
  }
  assert.equal(checkIngestRateLimit("k", 1000).ok, false);
  assert.equal(
    checkIngestRateLimit("k", 1000 + INGEST_RATE_LIMIT.windowMs + 1).ok,
    true,
  );
});

test("body-size cap is a sane positive bound", () => {
  assert.ok(MAX_INGEST_BODY_BYTES >= 1024 && MAX_INGEST_BODY_BYTES <= 65536);
});
