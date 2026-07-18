"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pageLabelForSlug } from "@/lib/analytics-display";

interface BookTotals {
  book_views: number;
  chapter_views: number;
  completions: number;
  pdf_downloads: number;
  agent_reads: number;
  completion_rate: number;
  count: number;
}
interface PageTotals {
  page_views: number;
  feed_reads: number;
  count: number;
}
interface TrendRow {
  day: string;
  count: number;
}
interface QuickWindowRow {
  window: "24h" | "7d" | "30d";
  current_count: number;
  previous_count: number;
}
interface BookRow {
  book_slug: string;
  book_views: number;
  chapter_views: number;
  completions: number;
  completion_rate: number;
  count: number;
}
interface TopPageRow {
  page_slug: string;
  page_views: number;
  feed_reads: number;
  count: number;
}
interface ReferrerRow {
  referrer: string;
  count: number;
}
interface ReferrerCategoryRow {
  category: string;
  count: number;
}
interface SignalValueRow {
  value: string;
  count: number;
}
interface AgentRow {
  book_slug: string;
  agent: string | null;
  ts: string;
}
interface ChapterRow {
  chapter_slug: string;
  views: number;
  completions: number;
  completion_rate: number;
}
interface AudienceRow {
  count: number;
}
interface VisitorKindRow extends AudienceRow {
  visitor_kind: string;
}
interface CountryRow extends AudienceRow {
  country: string;
}
interface RegionRow extends AudienceRow {
  region: string;
}
interface DeviceRow extends AudienceRow {
  device: string;
}
interface BrowserRow extends AudienceRow {
  browser: string;
}
interface OsRow extends AudienceRow {
  os: string;
}
interface EngagementData {
  sessions: number;
  avg_active_ms: number;
  avg_visible_ms: number;
  avg_scroll_depth: number;
  engaged_sessions: number;
  depth_85_count: number;
  depth_85_rate: number;
}
interface FunnelData {
  book_views: number;
  chapter_views: number;
  engaged_sessions: number;
  depth_85_sessions: number;
  completions: number;
  pdf_downloads: number;
  agent_reads: number;
}
interface VisitorsData {
  unique_visitors: number;
  returning_visitors: number;
  new_visitors: number;
}

interface OverviewData {
  bookSlugs: { book_slug: string }[];
  bookTotals: BookTotals;
  bookQuickWindows: QuickWindowRow[];
  bookDailyTrend: TrendRow[];
  topBooks: BookRow[];
  recentAgents: AgentRow[];
  pageTotals: PageTotals;
  pageQuickWindows: QuickWindowRow[];
  pageDailyTrend: TrendRow[];
  topPages: TopPageRow[];
  topReferrers: ReferrerRow[];
  topReferrerCategories: ReferrerCategoryRow[];
  chapterStats?: ChapterRow[];
  audience?: {
    visitorKinds: VisitorKindRow[];
    countries: CountryRow[];
    regions: RegionRow[];
    devices: DeviceRow[];
    browsers: BrowserRow[];
    os: OsRow[];
  };
  engagement?: EngagementData;
  funnel?: FunnelData;
  visitors?: VisitorsData;
  signals?: {
    outbound: SignalValueRow[];
    searches: SignalValueRow[];
    notFound: SignalValueRow[];
  };
}

type AuthState = "checking" | "login" | "authed";
type ActivePanel = "books" | "pages" | "insights" | "account";

interface SessionInfo {
  authenticated: boolean;
  user: string;
  passwordUpdatedAt: string | null;
  expiresAt: string;
  ttlSeconds: number;
}

const EMPTY_BOOK_TOTALS: BookTotals = {
  book_views: 0,
  chapter_views: 0,
  completions: 0,
  pdf_downloads: 0,
  agent_reads: 0,
  completion_rate: 0,
  count: 0,
};
const EMPTY_PAGE_TOTALS: PageTotals = {
  page_views: 0,
  feed_reads: 0,
  count: 0,
};
const EMPTY_AUDIENCE: NonNullable<OverviewData["audience"]> = {
  visitorKinds: [],
  countries: [],
  regions: [],
  devices: [],
  browsers: [],
  os: [],
};
const EMPTY_ENGAGEMENT: EngagementData = {
  sessions: 0,
  avg_active_ms: 0,
  avg_visible_ms: 0,
  avg_scroll_depth: 0,
  engaged_sessions: 0,
  depth_85_count: 0,
  depth_85_rate: 0,
};
const EMPTY_FUNNEL: FunnelData = {
  book_views: 0,
  chapter_views: 0,
  engaged_sessions: 0,
  depth_85_sessions: 0,
  completions: 0,
  pdf_downloads: 0,
  agent_reads: 0,
};
const EMPTY_VISITORS: VisitorsData = {
  unique_visitors: 0,
  returning_visitors: 0,
  new_visitors: 0,
};
const EMPTY_SIGNALS: NonNullable<OverviewData["signals"]> = {
  outbound: [],
  searches: [],
  notFound: [],
};

export function AnalyticsDashboard() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [username, setUsername] = useState("aklman");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [range, setRange] = useState(30);
  const [filterBook, setFilterBook] = useState("");
  const [activePanel, setActivePanel] = useState<ActivePanel>("books");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const didLoad = useRef(false);
  const overviewRequestSeqRef = useRef(0);
  const overviewAbortRef = useRef<AbortController | null>(null);

  const fetchSessionInfo = useCallback(async () => {
    const res = await fetch("/api/analytics/session");
    if (!res.ok) throw new Error("unauthenticated");
    return (await res.json()) as SessionInfo;
  }, []);

  const fetchApi = useCallback(
    async (params: Record<string, string>, signal?: AbortSignal) => {
      const qs = new URLSearchParams(params);
      const res = await fetch(`/api/analytics/query?${qs}`, { signal });
      if (!res.ok) {
        // Keep the HTTP 401 sentinel so loadOverview can bounce to login.
        if (res.status === 401) throw new Error("HTTP 401");
        // Surface a DB failure with the driver's own message instead of a bare
        // status code, so an operator sees the actionable cause in the banner.
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        if (payload?.error === "database") {
          throw new Error(
            `Database unavailable — ${payload.message ?? "query failed"}`,
          );
        }
        throw new Error(payload?.message || `HTTP ${res.status}`);
      }
      return res.json();
    },
    [],
  );

  const loadOverview = useCallback(
    async (overrides?: { book?: string; range?: number }) => {
      const slug = overrides?.book ?? filterBook;
      const r = overrides?.range ?? range;
      const requestSeq = ++overviewRequestSeqRef.current;
      overviewAbortRef.current?.abort();
      const controller = new AbortController();
      overviewAbortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string> = {
          view: "overview",
          range: String(r),
        };
        if (slug) params.bookSlug = slug;
        const nextOverview = (await fetchApi(
          params,
          controller.signal,
        )) as OverviewData;
        if (requestSeq !== overviewRequestSeqRef.current) return;
        setOverview(nextOverview);
        setLastUpdatedAt(new Date().toISOString());
      } catch (e) {
        if (controller.signal.aborted || requestSeq !== overviewRequestSeqRef.current) {
          return;
        }
        setError(e instanceof Error ? e.message : "fetch failed");
        if (e instanceof Error && e.message === "HTTP 401") {
          setAuthState("login");
        }
      } finally {
        if (requestSeq === overviewRequestSeqRef.current) {
          setLoading(false);
          if (overviewAbortRef.current === controller) {
            overviewAbortRef.current = null;
          }
        }
      }
    },
    [fetchApi, range, filterBook],
  );

  useEffect(() => {
    return () => overviewAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    fetchSessionInfo()
      .then((data) => {
        setSessionInfo(data);
        setAuthState("authed");
      })
      .catch(() => setAuthState("login"));
  }, [fetchSessionInfo]);

  useEffect(() => {
    if (authState === "authed" && !didLoad.current) {
      didLoad.current = true;
      loadOverview();
    }
  }, [authState, loadOverview]);

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/analytics/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      setLoginError("Invalid username or password.");
      return;
    }
    setPassword("");
    const session = await fetchSessionInfo().catch(() => {
      return {
        authenticated: true,
        user: username,
        passwordUpdatedAt: null,
        expiresAt: "",
        ttlSeconds: 0,
      };
    });
    setSessionInfo(session);
    setAuthState("authed");
    didLoad.current = false;
  };

  const logout = async () => {
    overviewAbortRef.current?.abort();
    await fetch("/api/analytics/logout", { method: "POST" });
    setOverview(null);
    setSessionInfo(null);
    setLastUpdatedAt(null);
    didLoad.current = false;
    setAuthState("login");
  };

  const changePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordMessage("");
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    const res = await fetch("/api/analytics/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setPasswordMessage(data.error ?? "Password update failed.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    const session = await fetchSessionInfo().catch(() => null);
    if (session) setSessionInfo(session);
    setPasswordMessage("Password updated.");
  };

  if (authState === "checking") {
    return (
      <main className="an-shell" id="main">
        <div className="an-auth">
          <h1 className="an-auth__title">Stats</h1>
          <p className="an-auth__hint">Checking session…</p>
        </div>
      </main>
    );
  }

  if (authState === "login") {
    return (
      <main className="an-shell" id="main">
        <div className="an-auth">
          <h1 className="an-auth__title">Stats</h1>
          <p className="an-auth__hint">
            Sign in as <code>aklman</code>. The initial password is
            <code> ANALYTICS_SECRET</code>.
          </p>
          <form className="an-auth__form an-auth__form--stack" onSubmit={login}>
            <input
              className="an-auth__input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <input
              className="an-auth__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              autoFocus
            />
            <button className="an-auth__btn" type="submit">
              Log In
            </button>
          </form>
          {loginError && <p className="an-auth__error">{loginError}</p>}
        </div>
      </main>
    );
  }

  const bookTotals = overview?.bookTotals ?? EMPTY_BOOK_TOTALS;
  const pageTotals = overview?.pageTotals ?? EMPTY_PAGE_TOTALS;
  const audience = overview?.audience ?? EMPTY_AUDIENCE;
  const engagement = overview?.engagement ?? EMPTY_ENGAGEMENT;
  const funnel = overview?.funnel ?? EMPTY_FUNNEL;
  const visitors = overview?.visitors ?? EMPTY_VISITORS;
  const signals = overview?.signals ?? EMPTY_SIGNALS;
  const refreshStatus = loading
    ? "Updating..."
    : lastUpdatedAt
      ? `Last updated ${fmtTime(lastUpdatedAt)}`
      : "Not updated yet";

  return (
    <main className="an-shell" id="main">
      <header className="an-header">
        <div className="an-header__top">
          <h1 className="an-header__title">Stats</h1>
          <div className="an-header__nav">
            <div className="an-tabs" role="tablist" aria-label="Stats panels">
              <button
                className={`an-tab ${activePanel === "books" ? "is-active" : ""}`}
                id="stats-tab-books"
                type="button"
                role="tab"
                aria-selected={activePanel === "books"}
                aria-controls="stats-panel-books"
                onClick={() => setActivePanel("books")}
              >
                Books
              </button>
              <button
                className={`an-tab ${activePanel === "pages" ? "is-active" : ""}`}
                id="stats-tab-pages"
                type="button"
                role="tab"
                aria-selected={activePanel === "pages"}
                aria-controls="stats-panel-pages"
                onClick={() => setActivePanel("pages")}
              >
                Pages
              </button>
              <button
                className={`an-tab ${
                  activePanel === "insights" ? "is-active" : ""
                }`}
                id="stats-tab-insights"
                type="button"
                role="tab"
                aria-selected={activePanel === "insights"}
                aria-controls="stats-panel-insights"
                onClick={() => setActivePanel("insights")}
              >
                Insights
              </button>
              <button
                className={`an-tab ${
                  activePanel === "account" ? "is-active" : ""
                }`}
                id="stats-tab-account"
                type="button"
                role="tab"
                aria-selected={activePanel === "account"}
                aria-controls="stats-panel-account"
                onClick={() => setActivePanel("account")}
              >
                Account
              </button>
            </div>
            <button
              className="an-btn an-btn--text an-header__logout"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>
        {activePanel !== "account" && (
          <div className="an-header__controls">
            {(activePanel === "books" || activePanel === "insights") && (
              <select
                className="an-select an-select--book"
                aria-label="Filter by book"
                value={filterBook}
                onChange={(e) => {
                  const slug = e.target.value;
                  setFilterBook(slug);
                  loadOverview({ book: slug });
                }}
              >
                <option value="">All Books</option>
                {(overview?.bookSlugs ?? []).map((b) => (
                  <option key={b.book_slug} value={b.book_slug}>
                    {b.book_slug}
                  </option>
                ))}
              </select>
            )}
            <select
              className="an-select"
              aria-label="Date range"
              value={range}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRange(r);
                loadOverview({ range: r });
              }}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
            <button
              className="an-btn"
              onClick={() => loadOverview()}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        )}
        {activePanel !== "account" && (
          <p
            className={`an-header__status${loading ? " is-updating" : ""}`}
            role="status"
            aria-live="polite"
          >
            {refreshStatus}
          </p>
        )}
      </header>

      {error && <p className="an-error">{error}</p>}

      {overview && (
        <>
          {activePanel === "books" && (
            <section
              className="an-panel"
              id="stats-panel-books"
              role="tabpanel"
              aria-labelledby="stats-tab-books"
            >
              <header className="an-panel__head">
                <p className="an-panel__eyebrow">Books Panel</p>
                <h2 className="an-panel__title">Books</h2>
              </header>
              <QuickSummary
                title="Book quick summary"
                rows={overview.bookQuickWindows}
              />
              <section className="an-cards">
                <MetricCard
                  label="Completion Rate"
                  value={`${bookTotals.completion_rate}%`}
                />
                <MetricCard label="Book Views" value={bookTotals.book_views} />
                <MetricCard
                  label="Chapter Views"
                  value={bookTotals.chapter_views}
                />
                <MetricCard label="Completions" value={bookTotals.completions} />
                <MetricCard
                  label="PDF Downloads"
                  value={bookTotals.pdf_downloads}
                />
                <MetricCard label="Agent Reads" value={bookTotals.agent_reads} />
              </section>
              <TrendSection
                title="Book Daily Trend"
                rows={overview.bookDailyTrend}
                empty="No book activity yet."
              />
              {filterBook && overview.chapterStats ? (
                <ChapterStatsTable
                  rows={overview.chapterStats}
                  bookSlug={filterBook}
                />
              ) : (
                <TopBooksTable
                  rows={overview.topBooks}
                  onSelect={(bookSlug) => {
                    setFilterBook(bookSlug);
                    loadOverview({ book: bookSlug });
                  }}
                />
              )}
              <AgentReadsTable rows={overview.recentAgents} />
            </section>
          )}

          {activePanel === "pages" && (
            <section
              className="an-panel"
              id="stats-panel-pages"
              role="tabpanel"
              aria-labelledby="stats-tab-pages"
            >
              <header className="an-panel__head">
                <p className="an-panel__eyebrow">Pages Panel</p>
                <h2 className="an-panel__title">Pages and Feed</h2>
              </header>
              <QuickSummary
                title="Page quick summary"
                rows={overview.pageQuickWindows}
              />
              <section className="an-cards an-cards--compact">
                <MetricCard label="Page Views" value={pageTotals.page_views} />
                <MetricCard label="RSS Reads" value={pageTotals.feed_reads} />
              </section>
              <TrendSection
                title="Page Daily Trend"
                rows={overview.pageDailyTrend}
                empty="No page or feed activity yet."
              />
              <TopPagesTable rows={overview.topPages} />
              <ReferrerCategoriesTable rows={overview.topReferrerCategories} />
              <ReferrersTable rows={overview.topReferrers} />
              <SignalsSection
                title="Top Searches"
                columnLabel="Query"
                rows={signals.searches}
                empty="No searches recorded yet."
              />
              <SignalsSection
                title="Outbound Clicks"
                columnLabel="Destination"
                rows={signals.outbound}
                empty="No outbound clicks recorded yet."
              />
              <SignalsSection
                title="Top 404s"
                columnLabel="Path"
                rows={signals.notFound}
                empty="No 404s recorded yet."
              />
            </section>
          )}

          {activePanel === "insights" && (
            <section
              className="an-panel an-insights"
              id="stats-panel-insights"
              role="tabpanel"
              aria-labelledby="stats-tab-insights"
            >
              <header className="an-panel__head">
                <p className="an-panel__eyebrow">Insights Panel</p>
                <h2 className="an-panel__title">Insights</h2>
              </header>
              <VisitorsSummary data={visitors} />
              <EngagementSummary data={engagement} />
              <FunnelSection data={funnel} />
              <AudienceSection data={audience} />
            </section>
          )}

        </>
      )}
      {activePanel === "account" && (
        <section
          className="an-panel an-account"
          id="stats-panel-account"
          role="tabpanel"
          aria-labelledby="stats-tab-account"
        >
          <header className="an-panel__head">
            <p className="an-panel__eyebrow">Account Panel</p>
            <h2 className="an-panel__title">Account</h2>
          </header>
          <div className="an-account__status">
            <div>
              <span>Signed in as</span>
              <strong>{sessionInfo?.user ?? "aklman"}</strong>
            </div>
            <div>
              <span>Password updated</span>
              <strong>
                {fmtOptionalTime(sessionInfo?.passwordUpdatedAt ?? null)}
              </strong>
            </div>
            <div>
              <span>Session expires</span>
              <strong>{fmtOptionalTime(sessionInfo?.expiresAt ?? null)}</strong>
            </div>
          </div>
          <form className="an-account__form" onSubmit={changePassword}>
            <input
              className="an-auth__input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
            />
            <input
              className="an-auth__input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
            />
            <input
              className="an-auth__input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <button className="an-btn" type="submit">
              Update Password
            </button>
          </form>
          {passwordMessage && (
            <p className="an-account__message">{passwordMessage}</p>
          )}
        </section>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="an-card">
      <span className="an-card__value">{value}</span>
      <span className="an-card__label">{label}</span>
    </div>
  );
}

function VisitorsSummary({ data }: { data: VisitorsData }) {
  const returningRate =
    data.unique_visitors > 0
      ? (data.returning_visitors / data.unique_visitors) * 100
      : 0;
  return (
    <section className="an-section">
      <div className="an-section__heading">
        <h3 className="an-section__title">Visitors</h3>
        <p className="an-section__note">
          Distinct readers by durable first-party id; returning = seen on 2+
          days.
        </p>
      </div>
      <section className="an-cards an-cards--insights">
        <MetricCard label="Unique Visitors" value={data.unique_visitors} />
        <MetricCard label="Returning" value={data.returning_visitors} />
        <MetricCard label="New" value={data.new_visitors} />
        <MetricCard label="Returning Rate" value={fmtPercent(returningRate)} />
      </section>
    </section>
  );
}

function EngagementSummary({ data }: { data: EngagementData }) {
  return (
    <section className="an-section">
      <div className="an-section__heading">
        <h3 className="an-section__title">Engagement</h3>
        <p className="an-section__note">
          Heartbeat uses active visible reading time.
        </p>
      </div>
      <section className="an-cards an-cards--insights">
        <MetricCard label="Reading Sessions" value={data.sessions} />
        <MetricCard label="Engaged Sessions" value={data.engaged_sessions} />
        <MetricCard label="Avg Active" value={fmtDuration(data.avg_active_ms)} />
        <MetricCard
          label="Avg Visible"
          value={fmtDuration(data.avg_visible_ms)}
        />
        <MetricCard
          label="Avg Scroll"
          value={fmtPercent(data.avg_scroll_depth)}
        />
        <MetricCard label="Depth 85%" value={fmtPercent(data.depth_85_rate)} />
      </section>
    </section>
  );
}

function FunnelSection({ data }: { data: FunnelData }) {
  const steps = [
    { label: "Book Views", value: data.book_views },
    { label: "Chapter Views", value: data.chapter_views },
    { label: "Engaged Sessions", value: data.engaged_sessions },
    { label: "Depth >=85%", value: data.depth_85_sessions },
    { label: "Completions", value: data.completions },
    { label: "PDF Downloads", value: data.pdf_downloads },
  ];

  return (
    <section className="an-section">
      <h3 className="an-section__title">Funnel</h3>
      <div className="an-funnel">
        {steps.map((step, index) => (
          <FunnelStep
            key={step.label}
            label={step.label}
            value={step.value}
            previous={index > 0 ? steps[index - 1].value : null}
          />
        ))}
        <div className="an-funnel__agent">
          <span>Agent Reads</span>
          <strong>{data.agent_reads}</strong>
        </div>
      </div>
    </section>
  );
}

function FunnelStep({
  label,
  value,
  previous,
}: {
  label: string;
  value: number;
  previous: number | null;
}) {
  return (
    <div className="an-funnel__step">
      <span className="an-funnel__label">{label}</span>
      <strong className="an-funnel__value">{value}</strong>
      <span className="an-funnel__rate">{conversionRate(value, previous)}</span>
    </div>
  );
}

function AudienceSection({
  data,
}: {
  data: NonNullable<OverviewData["audience"]>;
}) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">Audience</h3>
      <div className="an-audience">
        <AudienceBreakdown
          title="Visitor Kind"
          rows={data.visitorKinds.map((row) => ({
            label: visitorKindLabel(row.visitor_kind),
            count: row.count,
          }))}
        />
        <AudienceBreakdown
          title="Device"
          rows={data.devices.map((row) => ({
            label: row.device,
            count: row.count,
          }))}
        />
        <AudienceBreakdown
          title="Browser"
          rows={data.browsers.map((row) => ({
            label: row.browser,
            count: row.count,
          }))}
        />
        <AudienceBreakdown
          title="OS"
          rows={data.os.map((row) => ({ label: row.os, count: row.count }))}
        />
        <AudienceBreakdown
          title="Country"
          rows={data.countries.map((row) => ({
            label: row.country,
            count: row.count,
          }))}
        />
        <AudienceBreakdown
          title="Region"
          rows={data.regions.map((row) => ({
            label: row.region,
            count: row.count,
          }))}
        />
      </div>
    </section>
  );
}

function AudienceBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  const max = rows.reduce((current, row) => Math.max(current, row.count), 0);

  return (
    <section className="an-audience__group">
      <h4 className="an-audience__title">{title}</h4>
      {rows.length > 0 ? (
        <ol className="an-audience__list">
          {rows.map((row) => (
            <li className="an-audience__row" key={`${title}-${row.label}`}>
              <span className="an-audience__label">{row.label}</span>
              <span className="an-audience__bar" aria-hidden="true">
                <span
                  style={{
                    width: `${max > 0 ? (row.count / max) * 100 : 0}%`,
                  }}
                />
              </span>
              <strong className="an-audience__count">{row.count}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="an-empty an-empty--tight">No data yet.</p>
      )}
    </section>
  );
}

function deltaLabel(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "new" : "flat";
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`;
}

function QuickSummary({
  title,
  rows,
}: {
  title: string;
  rows: QuickWindowRow[];
}) {
  return (
    <section className="an-quick" aria-label={title}>
      {rows.map((row) => (
        <div className="an-quick__item" key={row.window}>
          <span className="an-quick__label">{row.window}</span>
          <strong className="an-quick__value">{row.current_count}</strong>
          <span className="an-quick__delta">
            {deltaLabel(row.current_count, row.previous_count)}
          </span>
        </div>
      ))}
    </section>
  );
}

function TrendSection({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: TrendRow[];
  empty: string;
}) {
  const maxDaily = rows.reduce((m, r) => Math.max(m, r.count), 0);
  return (
    <section className="an-section">
      <h3 className="an-section__title">{title}</h3>
      {rows.length > 0 ? (
        <div className="an-chart">
          {rows.map((row) => {
            const pct = maxDaily > 0 ? (row.count / maxDaily) * 100 : 0;
            return (
              <div className="an-chart__bar-wrap" key={row.day}>
                <div
                  className="an-chart__bar"
                  style={{ height: `${pct}%` }}
                  title={`${row.day}: ${row.count}`}
                />
                <span className="an-chart__label">{row.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="an-empty">{empty}</p>
      )}
    </section>
  );
}

function ChapterStatsTable({
  rows,
  bookSlug,
}: {
  rows: ChapterRow[];
  bookSlug: string;
}) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">
        Chapter Stats · <code>{bookSlug}</code>
      </h3>
      {rows.length > 0 ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>Chapter</th>
              <th>Views</th>
              <th>Completions</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.chapter_slug}>
                <td>
                  <code>{c.chapter_slug}</code>
                </td>
                <td>{c.views}</td>
                <td>{c.completions}</td>
                <td>{c.completion_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">No chapter data yet.</p>
      )}
    </section>
  );
}

function TopBooksTable({
  rows,
  onSelect,
}: {
  rows: BookRow[];
  onSelect: (bookSlug: string) => void;
}) {
  const selectBook = (bookSlug: string) => onSelect(bookSlug);
  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    bookSlug: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectBook(bookSlug);
  };

  return (
    <section className="an-section">
      <h3 className="an-section__title">Top Books</h3>
      {rows.length > 0 ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>Book</th>
              <th>Book Views</th>
              <th>Ch. Views</th>
              <th>Completions</th>
              <th>Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr
                key={b.book_slug}
                className="an-table__clickable"
                role="button"
                tabIndex={0}
                aria-label={`Show chapter stats for ${b.book_slug}`}
                onClick={() => selectBook(b.book_slug)}
                onKeyDown={(event) => handleRowKeyDown(event, b.book_slug)}
              >
                <td>
                  <code>{b.book_slug}</code>
                </td>
                <td>{b.book_views}</td>
                <td>{b.chapter_views}</td>
                <td>{b.completions}</td>
                <td>{b.completion_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">No book views recorded yet.</p>
      )}
    </section>
  );
}

function AgentReadsTable({ rows }: { rows: AgentRow[] }) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">Agent Reads</h3>
      {rows.length > 0 ? (
        <table className="an-table an-table--agents">
          <thead>
            <tr>
              <th>Time</th>
              <th>Book</th>
              <th>User-Agent</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i}>
                <td>
                  <time>{fmtTime(a.ts)}</time>
                </td>
                <td>
                  <code>{a.book_slug}</code>
                </td>
                <td className="an-ua">{a.agent ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">No agent reads recorded yet.</p>
      )}
    </section>
  );
}

function TopPagesTable({ rows }: { rows: TopPageRow[] }) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">Top Pages</h3>
      {rows.length > 0 ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Page Views</th>
              <th>RSS Reads</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const display = pageLabelForSlug(p.page_slug);
              return (
                <tr key={p.page_slug}>
                  <td>
                    {display.path ? (
                      <a className="an-table__primary" href={display.path}>
                        {display.label}
                      </a>
                    ) : (
                      <span className="an-table__primary">{display.label}</span>
                    )}
                    <code>{p.page_slug}</code>
                  </td>
                  <td>{p.page_views}</td>
                  <td>{p.feed_reads}</td>
                  <td>{p.count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">No page or feed reads recorded yet.</p>
      )}
    </section>
  );
}

function ReferrersTable({ rows }: { rows: ReferrerRow[] }) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">Top Referrers</h3>
      {rows.length > 0 ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>Referrer</th>
              <th>Visits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.referrer}>
                <td className="an-ua">{r.referrer}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">No referrers recorded yet.</p>
      )}
    </section>
  );
}

function SignalsSection({
  title,
  columnLabel,
  rows,
  empty,
}: {
  title: string;
  columnLabel: string;
  rows: SignalValueRow[];
  empty: string;
}) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">{title}</h3>
      {rows.length > 0 ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>{columnLabel}</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.value}>
                <td className="an-ua">{r.value}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">{empty}</p>
      )}
    </section>
  );
}

function ReferrerCategoriesTable({ rows }: { rows: ReferrerCategoryRow[] }) {
  return (
    <section className="an-section">
      <h3 className="an-section__title">Referrer Categories</h3>
      {rows.length > 0 ? (
        <table className="an-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Visits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category}>
                <td>{r.category}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="an-empty">No referrers recorded yet.</p>
      )}
    </section>
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function fmtPercent(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0;
  return `${normalized.toFixed(normalized % 1 === 0 ? 0 : 1)}%`;
}

function conversionRate(value: number, previous: number | null): string {
  if (previous === null) return "start";
  if (previous <= 0) return "—";
  return fmtPercent((value / previous) * 100);
}

function visitorKindLabel(value: string): string {
  switch (value) {
    case "human":
      return "Human";
    case "search_bot":
      return "Search Bot";
    case "ai_agent":
      return "AI Agent";
    case "feed_reader":
      return "Feed Reader";
    case "bot":
      return "Bot";
    case "unknown":
      return "Unknown";
    default:
      return value;
  }
}

function fmtOptionalTime(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  return fmtTime(iso);
}
