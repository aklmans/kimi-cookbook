import Link from "next/link";
import { T } from "@/components/T";
import type { MonthlyIssue } from "@/lib/monthly";

export function MonthlyArchive({
  issues,
  currentSlug,
}: {
  issues: MonthlyIssue[];
  currentSlug?: string;
}) {
  return (
    <nav className="about-section monthly-archive" aria-label="月刊归档 / Monthly archive">
      <header className="about-section__head">
        <p className="about-section__label">— ARCHIVE</p>
        <h2 className="about-section__title">
          <T zh="月刊归档" en="Monthly Archive" />
          <span className="stop">.</span>
        </h2>
      </header>
      <div className="about-routes">
        {issues.map((issue, index) => (
          <div className="about-routes__row" key={issue.slug}>
            <h3>
              <Link
                href={`/monthly/${issue.slug}`}
                aria-current={currentSlug === issue.slug ? "page" : undefined}
              >
                <T zh={issue.title} en={issue.titleEn} />
              </Link>
            </h3>
            <p>
              <T zh={issue.subtitle} en={issue.subtitleEn} />
            </p>
            <span>
              {index === 0 ? (
                <T zh={`最新 · ${issue.month}`} en={`Latest · ${issue.month}`} />
              ) : (
                <T zh={`第 ${issue.volume} 期 · ${issue.month}`} en={`Vol. ${issue.volume} · ${issue.month}`} />
              )}
            </span>
          </div>
        ))}
      </div>
    </nav>
  );
}
