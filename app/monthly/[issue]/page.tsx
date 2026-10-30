import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonthlyIssue } from "../_components/MonthlyIssue";
import { getAllMonthlyIssues, getMonthlyIssue } from "@/lib/monthly";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllMonthlyIssues().map((issue) => ({ issue: issue.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ issue: string }>;
}): Promise<Metadata> {
  const { issue: slug } = await params;
  const issue = getMonthlyIssue(slug);
  if (!issue) return {};
  const url = `/monthly/${issue.slug}`;
  return {
    title: { absolute: `${issue.title} · Builders 月刊 ${issue.month}` },
    description: issue.lede,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: issue.title,
      description: issue.lede,
      url,
      siteName: "Kimi Cookbook",
      publishedTime: issue.date,
      modifiedTime: issue.date,
    },
  };
}

export default async function MonthlyIssuePage({
  params,
}: {
  params: Promise<{ issue: string }>;
}) {
  const { issue: slug } = await params;
  const issue = getMonthlyIssue(slug);
  if (!issue) notFound();
  return <MonthlyIssue issue={issue} issues={getAllMonthlyIssues()} />;
}
