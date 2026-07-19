/* Data model — README.md §数据层 */

export type Revision = {
  v: number;
  date: string; // "YYYY-MM"
};

/** Comment-area visibility. Resolved by commentsMode() in lib/books.ts with an
    explicit, TESTED default of "enabled" — a silent default once hid a whole
    comment section unnoticed in the sister project. "disabled" shows a closed
    notice; "hidden" omits the section entirely. */
export type CommentsMode = "enabled" | "disabled" | "hidden";

export type Chapter = {
  slug: string;
  title: string;
  titleEn: string;
  /** Compact title for use in chapter nav prev/next popovers.
      Falls back to `title` when absent. */
  titleShort?: string;
  /** English compact title; falls back to `titleEn`. */
  titleShortEn?: string;
  /** Optional display title for the chapter cover. Keep `title` as the
      full canonical title for metadata, search, RSS, and links. */
  coverTitle?: string;
  /** English display title for the chapter cover; falls back to `titleEn`. */
  coverTitleEn?: string;
  readTime: string; // e.g. "6 MIN"
  revisions: Revision[];
  /** Short lede shown on the chapter cover + RSS description. */
  lede?: string;
  ledeEn?: string;
  /** Poster-only summary (2–3 sentences) filling the share poster's
      middle band below the lede — written for people who will never
      open the chapter, not as an excerpt from it. */
  posterSummary?: string;
  /** Optional override for RSS pubDate / og article:published_time.
      "YYYY-MM-DD" or "YYYY-MM". When absent, the feed falls back to
      `revisions[0].date + "-01"` and finally to `book.date`. */
  publishedAt?: string;
  /** Frontmatter flag — drives <NextBook>. README §still-to-do. */
  isLastChapter?: boolean;
  /** Chapter is still being drafted — the chapter page renders a
      <DraftNotice> placeholder instead of compiling the MDX body, and
      the book TOC shows a "DRAFT" tag in place of the read-time.
      Search index + RSS feed skip the chapter while it's a draft. */
  draft?: boolean;
  /** Comment visibility for this chapter; overrides the book-level setting.
      Defaults to "enabled" via commentsMode(). */
  comments?: CommentsMode;
};

export type BookMeta = {
  slug: string;
  title: string;
  titleEn: string;
  /** Compact title for home / library cards (e.g. "字面意思" rather than
      "字面意思 · 电脑、网络与 AI 的术语手册"). Falls back to `title`. */
  titleShort?: string;
  /** English compact card title; falls back to `titleEn`. */
  titleShortEn?: string;
  /** Optional display title for the book cover + detail-page H1 when the
      canonical `title` is too long to sit cleanly in ~2 lines. Keep `title`
      as the full canonical title for metadata, search, RSS, and links. */
  coverTitle?: string;
  /** English cover / detail display title; falls back to `titleEn`. */
  coverTitleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  description: string;
  descriptionEn: string;
  /** Short hand-written teaser for home / library cards — about one line
      on a phone (~25–40 zh chars). Falls back to `description` (which the
      card then line-clamps). The full `description` still shows on the
      book detail page, OG image, and RSS. */
  lede?: string;
  ledeEn?: string;
  cover: string;
  coverAvailable?: boolean;
  author: string;
  date: string; // "YYYY-MM-DD"
  language: "zh-en" | "zh";
  tags: string[]; // e.g. ['TECH','PRACTICE']
  category: string; // e.g. 'TECH'
  /** Book-level reading minutes shown in the prototype ("35 分钟"). */
  readMinutes: number;
  /** Recommended next book slug — README §still-to-do (<NextBook>). */
  nextBook?: string;
  /** Book is still being drafted — hide it completely from the
      library, home, RSS, search, and OG. The detail / chapter /
      print / og-image routes do not get built (dynamicParams = false
      means any URL pointing at a draft book 404s). */
  draft?: boolean;
  /** Book-wide comment default; a chapter's own `comments` overrides it.
      Resolves to "enabled" when unset. */
  comments?: CommentsMode;
  chapters: Chapter[];
};
