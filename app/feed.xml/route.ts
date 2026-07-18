import { Feed } from "feed";
import { getAllBooks, chapterPublishedAt } from "@/lib/books";
import { absoluteUrl, SITE_YEAR } from "@/lib/site";
import { trackFeedRead } from "@/lib/analytics-server";

/* RSS 2.0 Route Handler (source: rss.html preview).
   Cache-Control keeps CDN freshness at 1 hour. */

export function GET(req: Request) {
  const feed = new Feed({
    title: "Kimi · 从长文本到一套 agent 栈",
    description:
      "Zhapar 写给已经付费 Kimi、却只用到一小部分的人 —— 每写完一章, 这里更新一次。",
    id: absoluteUrl("/"),
    link: absoluteUrl("/"),
    language: "zh-CN",
    copyright: `Zhapar · ${SITE_YEAR}`,
    feedLinks: { rss: absoluteUrl("/feed.xml") },
    author: { name: "Zhapar", link: absoluteUrl("/about") },
  });

  const usedDates = new Set<string>();
  const nextUniqueDate = (raw: string) => {
    const d = new Date(`${raw}T00:00:00Z`);
    while (usedDates.has(d.toISOString().slice(0, 10))) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    const value = d.toISOString().slice(0, 10);
    usedDates.add(value);
    return d;
  };

  for (const book of getAllBooks()) {
    for (const [i, ch] of book.chapters.entries()) {
      // Don't push draft chapters into the feed — subscribers shouldn't
      // get a notification for a placeholder. (Draft books are already
      // filtered by getAllBooks.)
      if (ch.draft) continue;
      const url = absoluteUrl(`/books/${book.slug}/${ch.slug}`);
      feed.addItem({
        title: `${ch.title} · ${book.title}`,
        id: url,
        link: url,
        description: ch.lede ?? book.description,
        date: nextUniqueDate(chapterPublishedAt(book, ch, i)),
        category: [{ name: book.category }],
      });
    }
  }

  trackFeedRead(req.headers.get("user-agent"));

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Location": absoluteUrl("/feed.xml"),
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
