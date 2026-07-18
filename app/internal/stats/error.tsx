"use client";

import Link from "next/link";

export default function InternalStatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.name === "ChunkLoadError" ||
    /ChunkLoadError/i.test(error.message || "");

  return (
    <section className="an-shell">
      <main className="an-auth">
        <h1 className="an-auth__title">Stats Load Error</h1>
        <p className="an-auth__hint">
          {isChunkError
            ? "The dashboard bundle failed to load this time."
            : "Something interrupted this stats page."}
        </p>
        <div style={{ display: "grid", gap: 12, justifyItems: "stretch" }}>
          <button className="an-btn" type="button" onClick={reset}>
            Reload stats view
          </button>
          <Link className="an-btn an-btn--text" href="/internal/stats">
            Open stats again
          </Link>
          <Link className="an-btn an-btn--text" href="/">
            Return home
          </Link>
        </div>
      </main>
    </section>
  );
}
