const DEFAULT_SITE_URL = "https://kimi.read.wiki";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL
).replace(/\/+$/, "");

/** Canonical host ("kimi.read.wiki") — QR target pin, poster footer. */
export const SITE_HOST = new URL(SITE_URL).host;

/** Site brand for chrome surfaces that letterspace it (poster masthead). */
export const SITE_NAME = "Kimi Cookbook";

/** Full-year copyright line used in footer / print colophon / about. */
export const SITE_YEAR = new Date().getFullYear();

export function absoluteUrl(pathname = "/"): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${SITE_URL}${path}`;
}
