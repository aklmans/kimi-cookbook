import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalyticsDashboard } from "../analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Stats · Kimi",
  robots: { index: false, follow: false },
};

/* Short internal stats dashboard route. */

export default function StatsPage() {
  return (
    <>
      <SiteHeader />
      <AnalyticsDashboard />
      <SiteFooter />
    </>
  );
}
