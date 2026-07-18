/* Build-time font loader for next/og ImageResponse.
    Fetches the actual font file from Google Fonts CSS so the OG previews
    render in v3 brand typography (Playfair italic, JetBrains Mono) instead
    of falling back to the runtime's default Georgia / Menlo. Each
    variant is fetched once per Node worker and cached for the rest of
    the build. */

const MAX_FONT_FETCH_ATTEMPTS = 3;
const FONT_FETCH_TIMEOUT_MS = 10_000;
const fontCache = new Map<string, Promise<ArrayBuffer>>();

async function fetchWithRetry(
  url: string,
  label: string,
  family: string,
  weight: number,
  italic: boolean,
): Promise<Response> {
  let lastError: string | number = "unknown";

  for (let attempt = 1; attempt <= MAX_FONT_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS) });
      if (res.ok) {
        return res;
      }
      lastError = res.status;
      if (attempt < MAX_FONT_FETCH_ATTEMPTS) {
        console.warn(
          `[og-fonts] ${label} attempt ${attempt}/${MAX_FONT_FETCH_ATTEMPTS} failed with HTTP ${res.status} for ${family} ${weight}${italic ? " italic" : ""}. Retrying…`,
        );
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_FONT_FETCH_ATTEMPTS) {
        console.warn(
          `[og-fonts] ${label} attempt ${attempt}/${MAX_FONT_FETCH_ATTEMPTS} threw for ${family} ${weight}${italic ? " italic" : ""}. Retrying…`,
        );
      }
    }
  }

  throw new Error(
    `[og-fonts] ${label} failed after ${MAX_FONT_FETCH_ATTEMPTS} attempts for ${family} ${weight}${italic ? " italic" : ""}: ${lastError}`,
  );
}

async function fetchFont(
  family: string,
  weight: number,
  italic: boolean,
): Promise<ArrayBuffer> {
  const familyParam = family.replace(/ /g, "+");
  const variant = italic ? `1,${weight}` : `0,${weight}`;
  const cssUrl = `https://fonts.googleapis.com/css2?family=${familyParam}:ital,wght@${variant}&display=swap`;

  // No User-Agent header — modern browsers receive WOFF2, which Satori
  // (under next/og) rejects with "Unsupported OpenType signature wOF2".
  // The bare request falls back to the legacy TTF/OTF endpoint.
  const cssRes = await fetchWithRetry(cssUrl, "CSS fetch", family, weight, italic);
  const cssText = await cssRes.text();
  const match = cssText.match(
    /src:\s*url\((https:\/\/[^)]+)\)\s*format\('(truetype|opentype)'\)/,
  );
  if (!match) {
    throw new Error(
      `[og-fonts] no TTF/OTF URL in CSS response for ${family} ${weight}${italic ? " italic" : ""}`,
    );
  }
  const fontRes = await fetchWithRetry(match[1], "font file fetch", family, weight, italic);
  return fontRes.arrayBuffer();
}

export function loadGoogleFont(
  family: string,
  weight: number,
  italic = false,
): Promise<ArrayBuffer> {
  const key = `${family}|${weight}|${italic ? "i" : "r"}`;
  let entry = fontCache.get(key);
  if (!entry) {
    entry = fetchFont(family, weight, italic).catch((error) => {
      // Remove failed promise so the next request can retry
      fontCache.delete(key);
      throw error;
    });
    fontCache.set(key, entry);
  }
  return entry;
}
