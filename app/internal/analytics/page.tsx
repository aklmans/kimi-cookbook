import { redirect } from "next/navigation";

/* Legacy path kept for old bookmarks. */

export default function LegacyAnalyticsPage() {
  redirect("/internal/stats");
}
