import type { Metadata } from "next";
import { MonthlyIssue } from "./_components/MonthlyIssue";
import { getAllMonthlyIssues, getLatestMonthlyIssue } from "@/lib/monthly";

export const metadata: Metadata = {
  title: "Kimi Builders 月刊 · 泛 Builder 进化指南",
  description:
    "AI 时代 Universal Builders 的月度场景雷达与认知进化报告。覆盖用 AI 学习、思考、构建、转型与协同。",
  alternates: { canonical: "/monthly" },
  openGraph: {
    type: "website",
    title: "Kimi Builders 月刊 · 进化指南",
    description: "超越写代码：用 AI 学习、思考、构建、转型与协同。",
    url: "/monthly",
    siteName: "Kimi Cookbook",
  },
};

export default function MonthlyPage() {
  return (
    <MonthlyIssue
      issue={getLatestMonthlyIssue()}
      issues={getAllMonthlyIssues()}
    />
  );
}
