import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/* WeChat Mini Program code backend (wxacode.getUnlimited) for
   /api/mp/v1/qrcode. Codes are immutable per (page, scene), so they are
   cached forever: an in-process Map serves repeat hits, and
   data/mp-qrcode/ (the durable shared/data dir on the Aliyun box)
   survives restarts — the 100k/day getUnlimited quota is never
   meaningfully touched. Credentials come from WECHAT_MP_APPID /
   WECHAT_MP_SECRET (env only, never the repo); without them the
   endpoint degrades to 503 and the Mini Program falls back to its
   bundled official code. */

const TOKEN_URL = "https://api.weixin.qq.com/cgi-bin/token";
const CODE_URL = "https://api.weixin.qq.com/wxa/getwxacodeunlimit";
// WeChat access tokens live 7200s; refresh ahead of expiry.
const TOKEN_TTL_MS = 7_000_000;

export class MpQrcodeError extends Error {
  readonly status: 502 | 503;

  constructor(message: string, status: 502 | 503) {
    super(message);
    this.status = status;
  }
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface CodeResult {
  image?: Buffer;
  errcode?: number;
  errmsg?: string;
}

let tokenCache: { value: string; expiresAt: number } | null = null;
const imageCache = new Map<string, Buffer>();

function cacheDir(): string {
  return (
    process.env.MP_QRCODE_CACHE_DIR ??
    path.join(process.cwd(), "data", "mp-qrcode")
  );
}

function cacheKey(page: string, scene: string): string {
  // The key mirrors the render parameters exactly: if width / is_hyaline
  // or friends ever change, tag the key so stale disk entries are
  // orphaned instead of served.
  return createHash("sha256")
    .update(`${page} ${scene}`)
    .digest("hex")
    .slice(0, 24);
}

function imageFormat(buf: Buffer): "png" | "jpeg" | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return "jpeg";
  return null;
}

async function fetchAccessToken(forceRefresh: boolean): Promise<string> {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value;
  }
  const appid = process.env.WECHAT_MP_APPID ?? "";
  const secret = process.env.WECHAT_MP_SECRET ?? "";
  if (!appid || !secret) {
    throw new MpQrcodeError(
      "WECHAT_MP_APPID / WECHAT_MP_SECRET are not configured",
      503,
    );
  }

  const url =
    `${TOKEN_URL}?grant_type=client_credential` +
    `&appid=${encodeURIComponent(appid)}` +
    `&secret=${encodeURIComponent(secret)}`;
  let body: TokenResponse;
  try {
    const res = await fetch(url);
    body = (await res.json()) as TokenResponse;
  } catch (err) {
    throw new MpQrcodeError(`wechat token request failed: ${String(err)}`, 502);
  }
  if (!body.access_token) {
    throw new MpQrcodeError(
      `wechat token rejected: ${body.errcode ?? "unknown"} ${body.errmsg ?? ""}`,
      502,
    );
  }
  tokenCache = { value: body.access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return tokenCache.value;
}

async function postCode(
  token: string,
  payload: Record<string, unknown>,
): Promise<CodeResult> {
  let res: Response;
  try {
    res = await fetch(`${CODE_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new MpQrcodeError(`wechat code request failed: ${String(err)}`, 502);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json") && imageFormat(buf)) {
    return { image: buf };
  }
  // Error path: WeChat reports failures as JSON — sometimes under a
  // generic content type. Never pass a non-image payload off as a code.
  try {
    const parsed = JSON.parse(buf.toString("utf8")) as {
      errcode?: number;
      errmsg?: string;
    };
    return { errcode: parsed.errcode ?? res.status, errmsg: parsed.errmsg };
  } catch {
    return {
      errcode: res.status,
      errmsg: `unexpected payload (${contentType || "no content-type"}, ${buf.length} bytes)`,
    };
  }
}

export async function getMpQrcode(
  page: string,
  scene: string,
): Promise<Buffer> {
  const key = cacheKey(page, scene);
  const hit = imageCache.get(key);
  if (hit) return hit;

  try {
    const disk = await readFile(path.join(cacheDir(), `${key}.png`));
    imageCache.set(key, disk);
    return disk;
  } catch {
    // Cache miss — generate below.
  }

  const payload: Record<string, unknown> = {
    page,
    width: 280,
    env_version: "release",
    check_path: false,
    // scene is REQUIRED by getUnlimited: omitting it trips errcode 40169
    // (invalid length for scene) and an empty string fails the same way
    // (see the WeChat community thread on parameter-less codes). The
    // caller passes the "home" sentinel for the home-page code; the
    // MP's home page ignores options.scene.
    scene,
  };

  let result = await postCode(await fetchAccessToken(false), payload);
  if (result.errcode === 40001) {
    // Access token expired/invalidated server-side — refresh once, retry.
    result = await postCode(await fetchAccessToken(true), payload);
  }
  if (!result.image) {
    throw new MpQrcodeError(
      `wechat code rejected: ${result.errcode ?? "unknown"} ${result.errmsg ?? ""}`,
      502,
    );
  }

  imageCache.set(key, result.image);
  try {
    await mkdir(cacheDir(), { recursive: true });
    await writeFile(path.join(cacheDir(), `${key}.png`), result.image);
  } catch {
    // Disk cache is best-effort; the in-process cache still serves hits.
  }
  return result.image;
}

/** Test hook: drop the in-process token + image caches (tests isolate the
    disk cache via MP_QRCODE_CACHE_DIR). */
export function resetMpQrcodeCaches(): void {
  tokenCache = null;
  imageCache.clear();
}
