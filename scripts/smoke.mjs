// @ts-check
/* Local browser smoke test — launch-critical user journeys.
   Uses Playwright (already a dev dependency). Run against a running server:

     npm start
     npm run test:smoke

   Or with a custom port:

     SMOKE_BASE_URL=http://localhost:3010 npm run test:smoke

   Does NOT start the server itself — the caller is responsible for that. */

import { chromium } from "playwright";

const BASE_URL = (
  process.env.SMOKE_BASE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

const failures = [];
const checks = [];

function check(name, pass) {
  checks.push({ name, pass });
  if (!pass) failures.push(name);
}

async function fetchStatus(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return res.status;
  } catch {
    return -1;
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return res.status === 200 ? await res.text() : "";
  } catch {
    return "";
  }
}

async function ping() {
  try {
    const res = await fetch(BASE_URL, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function main() {
  console.log("Smoke checks");
  console.log(`  target  ${BASE_URL}\n`);

  if (!(await ping())) {
    console.error(
      `\n✗ Server not reachable at ${BASE_URL}.\n` +
        `  Start it first:  npm start\n` +
        `  Or set SMOKE_BASE_URL to a running server.\n`,
    );
    process.exit(1);
  }

  // ── HTTP surface checks (lightweight, no browser) ──
  const status200 = [
    "/",
    "/books/kimi",
    "/books/kimi/01-intro",
    "/about",
    "/license",
    "/internal/stats",
  ];
  for (const path of status200) {
    const status = await fetchStatus(`${BASE_URL}${path}`);
    check(`${path} returns 200`, status === 200);
  }

  const status404 = [
    "/books/warp",
    "/books/warp/llms.md",
    "/library",
    "/books/not-real",
  ];
  for (const path of status404) {
    const status = await fetchStatus(`${BASE_URL}${path}`);
    check(`${path} returns 404`, status === 404);
  }

  // Feed discovery
  const feed = await fetchText(`${BASE_URL}/feed.xml`);
  check(
    "/feed.xml contains <rss",
    feed.includes("<rss"),
  );

  // Robots
  const robots = await fetchText(`${BASE_URL}/robots.txt`);
  check(
    "/robots.txt contains Sitemap:",
    robots.includes("Sitemap:"),
  );

  // Sitemap
  const sitemap = await fetchText(`${BASE_URL}/sitemap.xml`);
  check(
    "/sitemap.xml contains /books/kimi",
    sitemap.includes("/books/kimi"),
  );
  check(
    "/sitemap.xml does NOT contain /books/warp",
    !sitemap.includes("/books/warp"),
  );
  check(
    "/sitemap.xml does NOT contain /library",
    !sitemap.includes("/library"),
  );

  // llms.txt
  const llmsTxt = await fetchText(`${BASE_URL}/llms.txt`);
  check(
    "/llms.txt contains /books/kimi/llms.md",
    llmsTxt.includes("/books/kimi/llms.md"),
  );
  check(
    "/llms.txt does NOT contain /books/warp/llms.md",
    !llmsTxt.includes("/books/warp/llms.md"),
  );

  // per-book llms.md
  const kimiLlms = await fetchText(`${BASE_URL}/books/kimi/llms.md`);
  check(
    "/books/kimi/llms.md contains # Kimi",
    kimiLlms.includes("# Kimi"),
  );
  check(
    "/books/kimi/llms.md has no <T ",
    !kimiLlms.includes("<T "),
  );

  // per-chapter llms.md
  const chLlms = await fetchText(`${BASE_URL}/books/kimi/08-code/llms.md`);
  check(
    "/books/kimi/08-code/llms.md contains the chapter title",
    chLlms.includes("# 写码"),
  );
  check(
    "/books/kimi/08-code/llms.md has no <T ",
    !chLlms.includes("<T "),
  );
  check(
    "/books/kimi/08-code/llms.md links the whole-book markdown",
    chLlms.includes("/books/kimi/llms.md"),
  );
  const chLlms404 = await fetchStatus(`${BASE_URL}/books/kimi/not-real/llms.md`);
  check("/books/kimi/not-real/llms.md returns 404", chLlms404 === 404);

  // whole-book llms.md: truncation fallback + completeness surfaces
  check(
    "/books/kimi/llms.md carries the agent fetch note",
    kimiLlms.includes("给 AI 读者的抓取说明"),
  );
  check(
    "/books/kimi/llms.md TOC links per-chapter markdown",
    kimiLlms.includes("/books/kimi/01-intro/llms.md"),
  );
  check(
    "/books/kimi/llms.md TOC links 09-selection (no slug guessing)",
    kimiLlms.includes("/books/kimi/09-selection/llms.md"),
  );
  check(
    "/books/kimi/llms.md ends with the signed attribution line",
    /\*Kimi · 从长文本到一套 agent 栈 · Zhapar 著/.test(kimiLlms.slice(-400)),
  );

  // llms.txt: chapter-granularity links
  check(
    "/llms.txt lists per-chapter markdown (09-selection)",
    llmsTxt.includes("/books/kimi/09-selection/llms.md"),
  );

  // HTML pages advertise their markdown twins for machine discovery
  const kimiBookHtml = await fetchText(`${BASE_URL}/books/kimi`);
  check(
    "/books/kimi advertises its text/markdown alternate",
    kimiBookHtml.includes('type="text/markdown"'),
  );
  const kimiChHtml = await fetchText(`${BASE_URL}/books/kimi/08-code`);
  check(
    "/books/kimi/08-code advertises its text/markdown alternate",
    kimiChHtml.includes('type="text/markdown"'),
  );

  // Chapter share surfaces: QR popover + share poster
  check(
    "/books/kimi/08-code bar offers the QR popover",
    kimiChHtml.includes("二维码"),
  );
  check(
    "/books/kimi/08-code bar links the share poster",
    kimiChHtml.includes("/books/kimi/08-code/poster.png"),
  );
  const poster = await fetch(`${BASE_URL}/books/kimi/01-intro/poster.png`);
  check(
    "/books/kimi/01-intro/poster.png returns a PNG",
    poster.status === 200 &&
      (poster.headers.get("content-type") ?? "").includes("image/png"),
  );
  const qrStatus = await fetchStatus(
    `${BASE_URL}/api/mp/qr.png?url=${encodeURIComponent("https://kimi.read.wiki/books/kimi/01-intro")}`,
  );
  check("/api/mp/qr.png serves the chapter QR", qrStatus === 200);

  // ── Mini Program content API (/api/mp/v1) ──
  async function fetchJson(url) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  const mpBook = await fetchJson(`${BASE_URL}/api/mp/v1/book`);
  check(
    "/api/mp/v1/book returns the single book with its chapter list",
    mpBook?.slug === "kimi" && mpBook?.chapters?.length === 10,
  );
  check(
    "/api/mp/v1/book carries the about page payload",
    mpBook?.about?.sections?.length === 4 &&
      mpBook.about.sections[2]?.ways?.length === 4 &&
      Boolean(mpBook.about.sections[3]?.license),
  );

  const mpVersion = await fetchJson(`${BASE_URL}/api/mp/v1/version`);
  check(
    "/api/mp/v1/version exposes a cache-invalidation version",
    typeof mpVersion?.version === "string" && mpVersion.version.length > 0,
  );

  const mpIntro = await fetchJson(`${BASE_URL}/api/mp/v1/chapters/01-intro`);
  check(
    "/api/mp/v1/chapters/01-intro renders cover + footnotes",
    !!mpIntro && mpIntro.html.includes("<h1") && mpIntro.html.includes("<sup"),
  );

  const mpCode = await fetchJson(`${BASE_URL}/api/mp/v1/chapters/08-code`);
  check(
    "/api/mp/v1/chapters/08-code keeps <pre> + Shiki inline colors",
    !!mpCode &&
      mpCode.html.includes("<pre") &&
      mpCode.html.includes('style="color:'),
  );
  check(
    "/api/mp/v1/chapters/08-code ships an outline with anchor ids",
    !!mpCode &&
      Array.isArray(mpCode.outline) &&
      mpCode.outline.length > 0 &&
      mpCode.outline.every((o) => typeof o.id === "string" && o.id.length > 0) &&
      mpCode.outline.some((o) => mpCode.html.includes(`id="${o.id}"`)),
  );
  check(
    "/api/mp/v1/chapters/08-code ships structured references",
    !!mpCode &&
      Array.isArray(mpCode.references) &&
      mpCode.references.length > 0 &&
      typeof mpCode.references[0].body === "string" &&
      mpCode.references[0].body.length > 0,
  );
  check(
    "/api/mp/v1/chapters/08-code ships copyable prompts + copy anchors",
    !!mpCode &&
      Array.isArray(mpCode.prompts) &&
      mpCode.prompts.length > 0 &&
      mpCode.prompts[0].template.length > 0 &&
      mpCode.html.includes('href="#kc-prompt-0"'),
  );
  check(
    "/api/mp/v1/chapters/08-code ships the chapter kicker quote",
    !!mpCode && typeof mpCode.kicker === "string" && mpCode.kicker.length > 0,
  );
  const mpHtmlSafe = [mpIntro, mpCode].every(
    (c) =>
      c &&
      !c.html.toLowerCase().includes("<script") &&
      !c.html.toLowerCase().includes("<iframe") &&
      !c.html.includes('class="v3-'),
  );
  check(
    "/api/mp/v1 chapter HTML is the restricted safe subset (no script/iframe/v3-chrome)",
    mpHtmlSafe,
  );
  check(
    "/api/mp/v1/chapters/08-code carries prev/next nav with full titles",
    !!mpCode &&
      mpCode.prev?.slug === "07-research" &&
      mpCode.prev.title.includes(" · ") &&
      mpCode.next?.slug === "09-selection" &&
      mpCode.next.title.includes(" · "),
  );

  const mpMissing = await fetchStatus(`${BASE_URL}/api/mp/v1/chapters/not-real`);
  check("/api/mp/v1/chapters/not-real returns 404", mpMissing === 404);

  const qrOk = await fetchStatus(
    `${BASE_URL}/api/mp/qr.png?url=${encodeURIComponent("https://kimi.read.wiki/books/kimi")}`,
  );
  check("/api/mp/qr.png serves a QR for a same-site url", qrOk === 200);
  const qrForeign = await fetchStatus(
    `${BASE_URL}/api/mp/qr.png?url=${encodeURIComponent("https://example.com/x")}`,
  );
  check("/api/mp/qr.png rejects a foreign url", qrForeign === 400);

  // ── Browser checks (Playwright) ──
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await ctx.newPage();

    // Helper: assert no horizontal overflow
    async function assertNoOverflow(path) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle" });
      const hasOverflow = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        return docWidth > winWidth;
      });
      check(`${path} has no horizontal overflow`, !hasOverflow);
    }

    async function tryLoginStats() {
      const secret = process.env.ANALYTICS_SECRET;
      if (!secret) return false;

      const insightsTab = page.locator("#stats-tab-insights");
      if ((await insightsTab.count()) > 0) return true;

      const passwordInput = page.locator('input[type="password"]').first();
      const loginVisible = await passwordInput
        .waitFor({ state: "visible", timeout: 1500 })
        .then(() => true)
        .catch(() => false);
      if (!loginVisible) return false;

      await page
        .locator('input[autocomplete="username"], input[type="text"]')
        .first()
        .fill("aklman")
        .catch(() => {});
      await passwordInput.fill(secret);
      await page.getByRole("button", { name: /log in/i }).click();

      return insightsTab
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => true)
        .catch(() => false);
    }

    async function assertStatsInsights() {
      await page.goto(`${BASE_URL}/internal/stats`, { waitUntil: "networkidle" });
      await tryLoginStats();
      await page
        .waitForFunction(() => {
          const text = document.body.innerText;
          return (
            document.querySelector("#stats-tab-insights") !== null ||
            text.includes("Checking session") ||
            text.includes("Log In") ||
            text.includes("ANALYTICS_SECRET")
          );
        }, null, { timeout: 10000 })
        .catch(() => {});

      const insightsTab = page.locator("#stats-tab-insights");
      const tabCount = await insightsTab.count();
      if (tabCount === 0) {
        const bodyText = await page.locator("body").innerText().catch(() => "");
        check(
          "/internal/stats shows login or session state without a saved session",
          /Checking session|Log In|ANALYTICS_SECRET/.test(bodyText),
        );
        return;
      }

      check("/internal/stats exposes #stats-tab-insights", tabCount > 0);
      await insightsTab.click();
      const insightsPanel = page.locator("#stats-panel-insights");
      const panelVisible = await insightsPanel
        .waitFor({ state: "visible", timeout: 10000 })
        .then(() => true)
        .catch(() => false);
      check("/internal/stats exposes #stats-panel-insights", panelVisible);

      const panelText = panelVisible ? await insightsPanel.innerText() : "";
      const normalizedPanelText = panelText.toLowerCase();
      check(
        "Insights panel contains engagement",
        normalizedPanelText.includes("engagement"),
      );
      check(
        "Insights panel contains funnel",
        normalizedPanelText.includes("funnel"),
      );
      check(
        "Insights panel contains audience",
        normalizedPanelText.includes("audience"),
      );
    }

    await assertNoOverflow("/");
    await assertNoOverflow("/books/kimi");
    await assertStatsInsights();

    // Search: open palette, type "Swarm", first result href
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-search-toggle]', { state: "visible" });
    await page.click('[data-search-toggle]');
    // Wait for search card to open
    await page.waitForSelector('.v3-search__input', { state: "visible" });
    await page.fill('.v3-search__input', 'Swarm');
    // Wait for debounce + results
    await page.waitForTimeout(300);
    const firstResult = await page.$eval('.v3-search__item', (el) => el.getAttribute('href'));
    check(
      'Search "Swarm" first result is /books/kimi/06-swarm',
      firstResult === '/books/kimi/06-swarm',
    );

    // Theme toggle
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.click('[data-theme-toggle]');
    await page.waitForTimeout(200);
    const toggledTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    check(
      'Theme toggle changes data-theme',
      toggledTheme !== initialTheme,
    );

    // Lang toggle
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    const initialLang = await page.evaluate(() => document.documentElement.dataset.lang);
    await page.click('[data-lang-toggle]');
    await page.waitForTimeout(200);
    const toggledLang = await page.evaluate(() => document.documentElement.dataset.lang);
    check(
      'Lang toggle changes data-lang',
      toggledLang !== initialLang,
    );

    // The PDF link must always target the static kimi.pdf export — also in
    // English mode (the book is zh-only, so there is no separate EN export
    // and the link must not fall through to a print-route URL).
    await page.goto(`${BASE_URL}/books/kimi`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.setItem("kimi:lang", "en"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const kimiPdfHref = await page.evaluate(() => {
      const pdfLink = [...document.querySelectorAll('a.book-detail__btn')].find((link) =>
        link.textContent?.includes("PDF"),
      );
      return pdfLink?.getAttribute("href") ?? "";
    });
    check(
      "PDF download link targets the static kimi.pdf export",
      kimiPdfHref === "/books/kimi.pdf",
    );

    // EN returning visitor must get correctly localized UI chrome. Lang-
    // dependent aria-labels/placeholders used to hydrate-mismatch and strand
    // EN readers on Chinese labels; they are now static bilingual (aria) or
    // open/mount-gated (placeholders). `page` is still in EN mode here.
    const enBackAria = await page.evaluate(
      () => document.querySelector(".back-to-top")?.getAttribute("aria-label") ?? "",
    );
    check(
      "EN visitor: back-to-top aria-label is static bilingual",
      enBackAria === "回到顶部 / Back to top",
    );
    await page.click("[data-search-toggle]");
    await page.waitForTimeout(150);
    const enSearchPlaceholder = await page.evaluate(
      () =>
        document.querySelector(".v3-search__input")?.getAttribute("placeholder") ??
        "",
    );
    check(
      "EN visitor: search placeholder localizes to English",
      enSearchPlaceholder === "Search books, chapters, keywords …",
    );

    // Print book-cover title must be upright — no synthesized CJK italic in
    // generated PDFs. ?lang=zh overrides the stored EN preference above.
    // The two-column jacket also renders a masthead band, a cover card, and a
    // 3-part colophon; guard them so the cover can't silently collapse.
    await page.goto(`${BASE_URL}/books/kimi/print?lang=zh`, {
      waitUntil: "networkidle",
    });
    const printCover = await page.evaluate(() => {
      const t = document.querySelector(".print-jacket__title");
      const masthead = document.querySelector(".print-jacket__masthead");
      const card = document.querySelector(".print-jacket__card .cover-visual");
      const coloParts = document.querySelectorAll(
        ".print-jacket__colophon > span",
      ).length;
      return {
        fontStyle: t ? getComputedStyle(t).fontStyle : "",
        hasMasthead: masthead !== null,
        hasCard: card !== null,
        coloParts,
      };
    });
    check(
      "Print book-cover title is upright (not synthesized italic)",
      printCover.fontStyle === "normal",
    );
    check(
      "Print cover renders the masthead + cover card + 3-part colophon (jacket)",
      printCover.hasMasthead && printCover.hasCard && printCover.coloParts === 3,
    );
    // Back-cover (bookPrintBackCover): the closing page must render the cover
    // card + its combined brand mark, the inline site QR, and the 3 site links.
    const backCover = await page.evaluate(() => {
      const bc = document.querySelector(".print-backcover");
      const qr = document.querySelector(".print-backcover__qr svg");
      const brand = document.querySelector(".print-backcover__mark");
      const links = document.querySelectorAll(
        ".print-backcover__links a",
      ).length;
      return {
        has: bc !== null,
        hasQr: qr !== null,
        hasBrand: brand !== null,
        links,
      };
    });
    check(
      "Print back-cover renders the cover card + brand mark + QR + 3 site links",
      backCover.has && backCover.hasQr && backCover.hasBrand && backCover.links === 3,
    );
    await page.evaluate(() => localStorage.removeItem("kimi:lang"));

    // Tab interaction on the API chapter (国内站 / 国际站 tabs)
    await page.goto(`${BASE_URL}/books/kimi/08-code`, { waitUntil: "networkidle" });
    const intlTab = page.getByRole("tab", { name: /国际站/ }).first();
    const intlTabCount = await intlTab.count();
    check(
      '/books/kimi/08-code has a 国际站 tab',
      intlTabCount > 0,
    );
    if (intlTabCount > 0) {
      await intlTab.click();
      await page.waitForTimeout(100);
    }
    const selected = intlTabCount > 0
      ? await intlTab.getAttribute("aria-selected")
      : null;
    check(
      '国际站 tab becomes aria-selected="true"',
      selected === 'true',
    );

    // Print smoke: /books/kimi/print
    await page.goto(`${BASE_URL}/books/kimi/print`, { waitUntil: "networkidle" });
    const hasFigure = await page.evaluate(() =>
      document.querySelector('figure[data-rehype-pretty-code-figure]') !== null
    );
    check(
      '/books/kimi/print has figure[data-rehype-pretty-code-figure]',
      hasFigure,
    );
    const hasFrame = await page.evaluate(() =>
      document.querySelector('.v3-codeblock__frame') !== null
    );
    check(
      '/books/kimi/print has .v3-codeblock__frame',
      hasFrame,
    );
    const hasShiki = await page.evaluate(() =>
      document.querySelector('.v3-codeblock__pre span') !== null
    );
    check(
      '/books/kimi/print has Shiki token spans',
      hasShiki,
    );
    const printOverflow = await page.evaluate(() => {
      // Real overflow guard. Compare scrollWidth to clientWidth (excludes any
      // vertical scrollbar) with a 1px tolerance for sub-pixel rounding; a
      // real regression still trips it.
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 1;
    });
    check(
      '/books/kimi/print has no horizontal overflow',
      !printOverflow,
    );
    // Print TOC rows are clickable and anchor to real chapter targets:
    // Chromium turns these #chapter-<slug> fragment links into GoTo
    // annotations so the exported PDF's 目录 jumps to each chapter. Guard
    // both that the links exist and that none dangle (every href resolves
    // to an article[id="chapter-<slug>"]).
    const tocLinkParity = await page.evaluate(() => {
      const links = [...document.querySelectorAll(".print-toc__link")];
      if (links.length === 0) return false;
      return links.every((a) => {
        const href = a.getAttribute("href") || "";
        return (
          href.startsWith("#chapter-") &&
          document.getElementById(href.slice(1)) !== null
        );
      });
    });
    check(
      "/books/kimi/print TOC rows link to real chapter anchors",
      tocLinkParity,
    );

    // Book detail hero: a brand mark + the text once + a 3-item colophon,
    // with NO separate cover panel (which used to duplicate the
    // kicker/title/lede).
    await page.goto(`${BASE_URL}/books/kimi`, { waitUntil: "networkidle" });    const detailStatCount = await page
      .locator(".book-detail__stats .book-detail__stat")
      .count();
    check("Book detail renders a 3-stat colophon", detailStatCount === 3);
    const detailCoverPanels = await page.locator(".book-detail__cover").count();
    check(
      "Book detail has no separate cover panel (single-column hero)",
      detailCoverPanels === 0,
    );
    const detailMarks = await page.locator(".book-detail__mark").count();
    check("Book detail renders the brand mark", detailMarks === 1);

    // Chapter reading-aids bar (目录 / MD / 让 Agent 读 / 二维码 / 海报)
    // on the cover
    await page.goto(`${BASE_URL}/books/kimi/01-intro`, {
      waitUntil: "networkidle",
    });
    const aidActions = await page.locator(".ch-actions__action").count();
    check(
      "Chapter cover renders the reading-aids bar with 5 actions",
      aidActions === 5,
    );

    // QR popover: hover shows, pointer-leave hides, click toggles,
    // Escape closes
    const qrButton = page.locator(".ch-actions__action", { hasText: "二维码" });
    await qrButton.hover();
    const qrPop = page.locator(".ch-actions__qr-pop");
    check(
      "QR popover opens on hover with the qr.png image",
      (await qrPop.count()) === 1 &&
        (await qrPop.locator("img").getAttribute("src"))?.includes(
          "/api/mp/qr.png?url=",
        ) === true,
    );
    await page.locator("h1").first().hover();
    check(
      "QR popover hides after the pointer leaves",
      (await page.locator(".ch-actions__qr-pop").count()) === 0,
    );
    await qrButton.click();
    check(
      "QR popover toggles open on click",
      (await page.locator(".ch-actions__qr-pop").count()) === 1,
    );
    await page.keyboard.press("Escape");
    check(
      "QR popover closes on Escape",
      (await page.locator(".ch-actions__qr-pop").count()) === 0,
    );

    // Poster action downloads the PNG in place (no throwaway tab)
    const posterLink = page.locator(".ch-actions__action", { hasText: "海报" });
    check(
      "Poster action downloads the PNG directly",
      ((await posterLink.getAttribute("download")) ?? "").endsWith(
        "-poster.png",
      ) && (await posterLink.getAttribute("target")) === null,
    );

    // Chapter reading pages must not overflow horizontally at tablet /
    // small-laptop widths. Checked in a dedicated 1024px context.
    const narrowCtx = await browser.newContext({
      viewport: { width: 1024, height: 768 },
    });
    try {
      const narrowPage = await narrowCtx.newPage();
      await narrowPage.goto(`${BASE_URL}/books/kimi/01-intro`, {
        waitUntil: "networkidle",
      });
      const chapterOverflow1024 = await narrowPage.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      check(
        "/books/kimi/01-intro has no horizontal overflow at 1024px",
        !chapterOverflow1024,
      );
    } finally {
      await narrowCtx.close();
    }
  } finally {
    await browser.close();
  }

  // ── Report ──
  const passed = checks.filter((c) => c.pass).length;
  const total = checks.length;
  console.log(`\n  ${passed}/${total} passed\n`);

  if (failures.length) {
    console.error("Smoke check failures:");
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error();
    process.exit(1);
  }

  console.log("Smoke checks passed.");
}

main().catch((err) => {
  console.error("\n✗ Smoke test crashed:");
  console.error(err);
  process.exit(1);
});
