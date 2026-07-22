import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { afterEach, beforeEach, mock } from "node:test";
import { GET } from "../app/api/mp/v1/qrcode/route";
import { resetMpQrcodeCaches } from "../lib/mp-qrcode";

/* Contract tests for /api/mp/v1/qrcode — the Mini Program's poster code
   endpoint (handoff spec: home code without slug, chapter direct code for
   manifest slugs, 400 for the rest; WeChat JSON errors must surface as
   502/503, never as an image). WeChat HTTP is stubbed through globalThis
   fetch; every test gets a fresh disk-cache dir so codes never leak
   across tests. */

// PNG magic bytes + payload — enough for the format sniffer.
const FAKE_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4,
]);

const TOKEN_HOST = "https://api.weixin.qq.com/cgi-bin/token";
const CODE_HOST = "https://api.weixin.qq.com/wxa/getwxacodeunlimit";

interface FetchCall {
  url: string;
  body?: Record<string, unknown>;
}

/** Stub global fetch. `codeResponses` are returned in order for POSTs to
    the code endpoint; token GETs rotate through `tokens`. Returns the call
    log. */
function stubWechat(
  tokens: string[],
  codeResponses: Response[],
): FetchCall[] {
  const calls: FetchCall[] = [];
  let tokenIndex = 0;
  let codeIndex = 0;
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(TOKEN_HOST)) {
      calls.push({ url });
      const token = tokens[Math.min(tokenIndex, tokens.length - 1)];
      tokenIndex += 1;
      return Response.json({ access_token: token, expires_in: 7200 });
    }
    if (url.startsWith(CODE_HOST)) {
      calls.push({
        url,
        body: JSON.parse(String(init?.body ?? "{}")) as Record<
          string,
          unknown
        >,
      });
      const res = codeResponses[Math.min(codeIndex, codeResponses.length - 1)];
      codeIndex += 1;
      return res.clone();
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  mock.method(globalThis, "fetch", impl);
  return calls;
}

function codeImage(): Response {
  return new Response(new Uint8Array(FAKE_PNG), {
    headers: { "Content-Type": "image/png" },
  });
}

function wechatError(errcode: number, errmsg: string): Response {
  return Response.json({ errcode, errmsg });
}

function requestFor(query: string): Request {
  return new Request(`http://localhost/api/mp/v1/qrcode${query}`);
}

beforeEach(() => {
  resetMpQrcodeCaches();
  // Fresh dir per test — read lazily inside lib/mp-qrcode.ts, so codes
  // written by an earlier test are invisible to the next one.
  process.env.MP_QRCODE_CACHE_DIR = mkdtempSync(
    path.join(tmpdir(), "mp-qrcode-"),
  );
  process.env.WECHAT_MP_APPID = "wx-test-appid";
  process.env.WECHAT_MP_SECRET = "wx-test-secret";
});

afterEach(() => {
  mock.restoreAll();
  delete process.env.MP_QRCODE_CACHE_DIR;
  delete process.env.WECHAT_MP_APPID;
  delete process.env.WECHAT_MP_SECRET;
});

test("no slug returns the immutable home-page code", async () => {
  const calls = stubWechat(["t1"], [codeImage()]);
  const res = await GET(requestFor(""));

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "image/png");
  assert.match(
    res.headers.get("Cache-Control") ?? "",
    /max-age=31536000, immutable/,
  );
  assert.deepEqual(Buffer.from(await res.arrayBuffer()), FAKE_PNG);

  const codeCall = calls.find((c) => c.body);
  assert.ok(codeCall, "wechat code endpoint was not called");
  assert.equal(codeCall.body?.page, "pages/book/book");
  assert.equal(codeCall.body?.width, 280);
  assert.equal(codeCall.body?.env_version, "release");
  assert.equal(codeCall.body?.check_path, false);
  // WeChat's original white-background image — no is_hyaline.
  assert.ok(!("is_hyaline" in codeCall.body!));
  // getUnlimited rejects a missing/empty scene — the home code carries
  // the "home" sentinel instead.
  assert.equal(codeCall.body?.scene, "home");
});

test("a manifest chapter slug returns the chapter direct code", async () => {
  const calls = stubWechat(["t1"], [codeImage()]);
  const res = await GET(requestFor("?slug=01-intro"));

  assert.equal(res.status, 200);
  const codeCall = calls.find((c) => c.body);
  assert.equal(codeCall?.body?.page, "pages/read/read");
  assert.equal(codeCall?.body?.scene, "01-intro");
});

test("a slug outside the manifest is rejected with 400", async () => {
  const calls = stubWechat(["t1"], [codeImage()]);
  const res = await GET(requestFor("?slug=nope"));

  assert.equal(res.status, 400);
  assert.equal(calls.length, 0, "wechat must not be called for bad slugs");
});

test("wechat JSON errors surface as 502, never as an image", async () => {
  stubWechat(["t1"], [wechatError(40013, "invalid appid")]);
  const res = await GET(requestFor(""));

  assert.equal(res.status, 502);
  assert.ok(!res.headers.get("Content-Type")?.includes("image"));
});

test("error JSON under a non-JSON content type is still not served", async () => {
  stubWechat(["t1"], [
    new Response(JSON.stringify({ errcode: 41030, errmsg: "invalid page" }), {
      headers: { "Content-Type": "text/plain" },
    }),
  ]);
  const res = await GET(requestFor(""));

  assert.equal(res.status, 502);
  assert.ok(!res.headers.get("Content-Type")?.includes("image"));
});

test("errcode 40001 forces a token refresh and one retry", async () => {
  const calls = stubWechat(["t1", "t2"], [
    wechatError(40001, "access_token expired"),
    codeImage(),
  ]);
  const res = await GET(requestFor(""));

  assert.equal(res.status, 200);
  const tokenCalls = calls.filter((c) => c.url.startsWith(TOKEN_HOST));
  const codeCalls = calls.filter((c) => c.url.startsWith(CODE_HOST));
  assert.equal(tokenCalls.length, 2, "expected a forced token refresh");
  assert.equal(codeCalls.length, 2, "expected exactly one retry");
  assert.match(codeCalls[0].url, /access_token=t1/);
  assert.match(codeCalls[1].url, /access_token=t2/);
});

test("missing wechat credentials degrade to 503 without calling wechat", async () => {
  delete process.env.WECHAT_MP_APPID;
  delete process.env.WECHAT_MP_SECRET;
  const calls = stubWechat(["t1"], [codeImage()]);

  const res = await GET(requestFor(""));
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test("a second request for the same code is served from cache", async () => {
  const calls = stubWechat(["t1"], [codeImage()]);

  const first = await GET(requestFor("?slug=01-intro"));
  const second = await GET(requestFor("?slug=01-intro"));

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(
    calls.filter((c) => c.url.startsWith(CODE_HOST)).length,
    1,
    "immutable code should be generated once, then cached",
  );
});
