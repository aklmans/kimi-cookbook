"use client";

import Giscus from "@giscus/react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/components/LangProvider";
import { T } from "@/components/T";

const REPO = process.env.NEXT_PUBLIC_GISCUS_REPO;
const REPO_ID = process.env.NEXT_PUBLIC_GISCUS_REPO_ID;
const CATEGORY = process.env.NEXT_PUBLIC_GISCUS_CATEGORY;
const CATEGORY_ID = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID;
const CONFIGURED = Boolean(REPO && REPO_ID && CATEGORY && CATEGORY_ID);

/* Cache-bust for the custom giscus theme CSS in /public. giscus and the browser
   cache the theme stylesheet hard, so bump this whenever giscus-v3-*.css change. */
const GISCUS_THEME_VERSION = "20260616";

type DiscussionState =
  | "closed"
  | "unconfigured"
  | "initializing"
  | "loading"
  | "loaded"
  | "failed";

/* `.discussion` — route-level comments via Giscus (GitHub Discussions).
   Mapping is pathname → one discussion per page URL. Theme stays
   in sync with next-themes. Set the four NEXT_PUBLIC_GISCUS_* env vars
   to enable; see .env.example. When unset the section is hidden. */
export function Discussion({ closed = false }: { closed?: boolean }) {
  const { lang } = useLang();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [widgetState, setWidgetState] = useState<
    Extract<DiscussionState, "initializing" | "loading" | "loaded" | "failed">
  >(
    "initializing",
  );
  const [widgetReload, setWidgetReload] = useState(0);
  const discussionRef = useRef<HTMLDivElement>(null);
  const discussionState: DiscussionState = closed
    ? "closed"
    : CONFIGURED
      ? widgetState
      : "unconfigured";

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!mounted || !CONFIGURED || closed) return;
    const host = discussionRef.current;
    if (!host) return;
    setWidgetState("loading");

    let settled = false;
    let watchdog: number | undefined;

    const settle = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(watchdog);
      setWidgetState("loaded");
    };

    // Success signal: giscus posts a message from its iframe (origin
    // giscus.app) the instant it renders — for empty AND populated
    // discussions alike — e.g. { giscus: { resizeHeight } }. This is the
    // reliable "loaded" event. The old approach polled the DOM for the iframe
    // node, but giscus-widget renders it inside a shadow root that
    // querySelector can't reach, so empty discussions tripped the failure
    // fallback even though giscus had loaded fine. A late message also
    // self-heals: if the widget recovers after the watchdog fired, this hides
    // the fallback again.
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== "https://giscus.app") return;
      const data = event.data as { giscus?: unknown } | null;
      if (data && typeof data === "object" && "giscus" in data) settle();
    };
    window.addEventListener("message", onMessage);

    // Failure watchdog — armed only once the section nears the viewport. The
    // iframe loads lazily (loading="lazy"), so it posts nothing until the
    // reader scrolls down; arming on mount would false-fail on every long page
    // before they ever reach the comments.
    const arm = () => {
      if (settled || watchdog) return;
      watchdog = window.setTimeout(() => {
        if (!settled) {
          setWidgetState("failed");
        }
      }, 8000);
    };

    let io: IntersectionObserver | undefined;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            arm();
            io?.disconnect();
          }
        },
        { rootMargin: "300px" },
      );
      io.observe(host);
    } else {
      arm();
    }

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(watchdog);
      io?.disconnect();
    };
  }, [mounted, widgetReload, closed]);

  // Comments turned off for this route (comments: "disabled") — show a closed
  // notice rather than the widget. ("hidden" omits the section in ChapterShell.)
  if (discussionState === "closed") {
    return (
      <section className="discussion" id="discussion" data-discussion-state="closed">
        <p className="discussion__label">— <T zh="讨论" en="Discussion" /></p>
        <h3 className="discussion__title">
          <T zh="讨论" en="Discussion" />
          <span className="stop">.</span>
        </h3>
        <p className="discussion__box">
          <T zh="本页评论已关闭。" en="Comments are closed for this page." />
        </p>
      </section>
    );
  }

  if (discussionState === "unconfigured") {
    return (
      <section
        className="discussion"
        id="discussion"
        data-discussion-state="unconfigured"
      >
        <p className="discussion__label">— <T zh="讨论" en="Discussion" /></p>
        <h3 className="discussion__title">
          <T zh="讨论" en="Discussion" />
          <span className="stop">.</span>
        </h3>
        <p className="discussion__box">
          <T
            zh="当前部署未配置讨论区参数，评论入口暂不可用。请检查 Vercel 的 NEXT_PUBLIC_GISCUS_* 环境变量。"
            en="Comments are disabled in this deployment. Please check NEXT_PUBLIC_GISCUS_* environment variables in Vercel."
          />
        </p>
      </section>
    );
  }

  // giscus fetches the custom theme CSS via a CORS request from its own iframe
  // (giscus.app), and only accepts a custom URL from a *trusted source*: any
  // https origin, plus http://localhost / 127.0.0.1 — the browser exempts
  // localhost from mixed-content, so the https giscus.app iframe can still load
  // it (this is what lets us preview the v3 skin locally). A non-localhost http
  // origin (a LAN-IP / http preview) is blocked, so we fall back to giscus's
  // built-in light/dark there. The CSS also needs an Access-Control-Allow-Origin
  // header — see next.config.ts. Bump GISCUS_THEME_VERSION whenever the CSS
  // changes; giscus and the browser cache it aggressively.
  const themeMode = resolvedTheme === "dark" ? "dark" : "light";
  const trustedThemeSource =
    mounted &&
    (window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const giscusTheme = trustedThemeSource
    ? `${window.location.origin}/giscus-v3-${themeMode}.css?v=${GISCUS_THEME_VERSION}`
    : themeMode;

  const retryDiscussion = () => {
    setWidgetReload((prev) => prev + 1);
  };

  return (
    <section
      className="discussion"
      id="discussion"
      data-discussion-state={discussionState}
    >
      <p className="discussion__label">— <T zh="讨论" en="Discussion" /></p>
      <h3 className="discussion__title">
        <T zh="讨论" en="Discussion" />
        <span className="stop">.</span>
      </h3>

      <div ref={discussionRef}>
        {mounted && (
          <Giscus
            key={widgetReload}
            repo={REPO as `${string}/${string}`}
            repoId={REPO_ID!}
            category={CATEGORY!}
            categoryId={CATEGORY_ID!}
            mapping="pathname"
            strict="0"
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition="bottom"
            theme={giscusTheme}
            lang={lang === "en" ? "en" : "zh-CN"}
            loading="lazy"
          />
        )}
      </div>
      {(discussionState === "initializing" ||
        discussionState === "loading") && (
        <p className="discussion__box" role="status" aria-live="polite">
          <T
            zh={
              discussionState === "loading"
                ? "评论区正在加载…"
                : "评论区初始化中…"
            }
            en={
              discussionState === "loading"
                ? "Comments are loading…"
                : "Initializing comments…"
            }
          />
        </p>
      )}
      {discussionState === "loaded" && (
        <p className="discussion__ready" role="status" aria-live="polite">
          <T zh="评论区已加载。" en="Comments loaded." />
        </p>
      )}
      {discussionState === "failed" && (
        <p className="discussion__box" role="alert" aria-live="assertive">
          <T
            zh="评论区加载失败，或仓库未开放 Discussions。可先前往 GitHub Discussions。"
            en="The comment widget failed to load, or Discussions is unavailable. Open GitHub Discussions first."
          />
          {" "}
          <a
            href={`https://github.com/${REPO}/discussions`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Discussions
          </a>
          <br />
          <button
            type="button"
            className="discussion__retry"
            onClick={retryDiscussion}
            aria-label="重试加载评论区 / Retry comment widget"
          >
            <T zh="重试加载评论区" en="Retry comment widget" />
          </button>
        </p>
      )}
    </section>
  );
}
