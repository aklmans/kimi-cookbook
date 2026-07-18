import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import {
  getAnalyticsAuthInfo,
  getAnalyticsPasswordHash,
  setAnalyticsPasswordHash,
} from "./db";

const scrypt = promisify(scryptCallback);

const USERNAME = "aklman";
const COOKIE_NAME = "aklman_stats_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_MIN_LENGTH = 6;
/* The initial ANALYTICS_SECRET bootstraps the first login and gets
   persisted as a password hash. A short / weak secret would be frozen
   into the DB forever (changing env later has no effect once the hash
   exists). Enforce a minimum length only at bootstrap — once a hash
   is stored, the user-changed password policy (PASSWORD_MIN_LENGTH)
   applies instead. */
const INITIAL_SECRET_MIN_LENGTH = 16;

type SessionPayload = {
  user: string;
  exp: number;
};

export interface AnalyticsSessionInfo {
  user: string;
  exp: number;
  expiresAt: string;
  ttlSeconds: number;
}

function initialSecret(): string {
  return process.env.ANALYTICS_SECRET ?? "";
}

/**
 * Cron auth for the scheduled rollup/prune. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set, so the job can
 * run without a dashboard session. Timing-safe. Returns false when CRON_SECRET
 * is unset, so a missing secret can never let an empty/absent bearer through.
 */
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
  }
  return cookies;
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function sessionSecret(): Promise<string> {
  const storedHash = await getAnalyticsPasswordHash(USERNAME);
  return `${initialSecret()}:${storedHash ?? "initial"}`;
}

async function sign(value: string): Promise<string> {
  return createHmac("sha256", await sessionSecret()).update(value).digest("base64url");
}

/* Constant-time comparison of the session HMAC signature. Falls back
   to false on malformed base64url / length mismatch instead of
   throwing, so a tampered cookie returns null (401) rather than a 500.
   Length check before timingSafeEqual is required — the function
   throws on unequal-length buffers. */
async function verifySignature(body: string, signature: string): Promise<boolean> {
  try {
    const expected = Buffer.from(await sign(body), "base64url");
    const actual = Buffer.from(signature, "base64url");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("base64url")}`;
}

async function verifyHash(password: string, storedHash: string): Promise<boolean> {
  const [scheme, salt, encoded] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, "base64url");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}

async function verifyPassword(password: string): Promise<boolean> {
  const storedHash = await getAnalyticsPasswordHash(USERNAME);
  if (storedHash) return verifyHash(password, storedHash);
  // Bootstrap: no hash stored yet, so the initial ANALYTICS_SECRET
  // becomes the password. Reject a weak / missing secret before it
  // gets frozen into the DB as a hash. Do not log the secret itself.
  const secret = initialSecret();
  if (secret.length < INITIAL_SECRET_MIN_LENGTH) {
    console.warn(
      `[analytics] Initial ANALYTICS_SECRET is too short ` +
        `(must be at least ${INITIAL_SECRET_MIN_LENGTH} chars). ` +
        `Bootstrap login refused; set a strong ANALYTICS_SECRET env var ` +
        `before the first sign-in.`,
    );
    return false;
  }
  if (password !== secret) return false;
  await setAnalyticsPasswordHash(USERNAME, await hashPassword(password));
  return true;
}

export function analyticsCookieName(): string {
  return COOKIE_NAME;
}

export async function getAnalyticsAccountStatus(): Promise<{
  user: string;
  passwordUpdatedAt: string | null;
}> {
  const authInfo = await getAnalyticsAuthInfo(USERNAME);
  return {
    user: USERNAME,
    passwordUpdatedAt: authInfo?.updated_at ?? null,
  };
}

export async function verifyAnalyticsLogin(
  username: string,
  password: string,
): Promise<boolean> {
  if (username !== USERNAME) return false;
  return verifyPassword(password);
}

export async function updateAnalyticsPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (!(await verifyPassword(currentPassword))) {
    return { ok: false, error: "Current password is incorrect." };
  }
  await setAnalyticsPasswordHash(USERNAME, await hashPassword(newPassword));
  return { ok: true };
}

export async function createAnalyticsSessionCookie(): Promise<string> {
  const payload: SessionPayload = {
    user: USERNAME,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(body);
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(`${body}.${signature}`)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export function clearAnalyticsSessionCookie(): string {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export async function readAnalyticsSession(
  req: Request,
): Promise<AnalyticsSessionInfo | null> {
  const token = parseCookies(req.headers.get("cookie"))[COOKIE_NAME];
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!(await verifySignature(body, signature))) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(body)) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.user !== USERNAME || payload.exp <= now) return null;
    return {
      user: payload.user,
      exp: payload.exp,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      ttlSeconds: payload.exp - now,
    };
  } catch {
    return null;
  }
}

export async function requireAnalyticsSession(req: Request): Promise<boolean> {
  return (await readAnalyticsSession(req)) !== null;
}
