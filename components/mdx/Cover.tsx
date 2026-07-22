import type { BookMeta, Chapter } from "@/lib/types";
import { formatByline } from "@/lib/format";
import { chapterModifiedAt } from "@/lib/book-dates";
import { T } from "@/components/T";
import { StopPunct } from "./StopPunct";
import { ChapterActions } from "./ChapterActions";

const CN_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const CN_TENS = ["", "十", "二十", "三十", "四十", "五十", "六十", "七十", "八十", "九十"];

function chineseNum(n: number): string {
  if (n < 1) return "";
  if (n < 10) return CN_DIGITS[n];
  if (n < 20) return `十${CN_DIGITS[n % 10]}`;
  return CN_TENS[Math.floor(n / 10)] + CN_DIGITS[n % 10];
}

/* `.v3-cover` — chapter title page. Data comes from meta.ts (closure
   in getMdxComponents), so the MDX body just writes `<Cover />`.
   The `--chapter` modifier owns the 100px top padding that lifts the
   eyebrow off the header, in line with .lib-cover / .about-cover.
   The reading-aids bar (ChapterActions) closes the header — the tools
   a reader should see before the body, not after. */
export function Cover({
  book,
  chapter,
  number,
}: {
  book: BookMeta;
  chapter: Chapter;
  number: string;
}) {
  const n = parseInt(number, 10);
  const title = chapter.coverTitle ?? chapter.title;
  const titleEn = chapter.coverTitleEn ?? chapter.titleEn;
  return (
    <section className="v3-cover v3-cover--chapter">
      <p className="v3-cover__eyebrow">
        — {number} /{" "}
        <T zh={`第${chineseNum(n)}章`} en={`Chapter ${n}`} />
      </p>
      <h1 className="v3-cover__title">
        <T zh={title} en={titleEn} />
        <StopPunct />
      </h1>
      {chapter.lede && (
        <p className="v3-cover__lede">
          <T zh={chapter.lede} en={chapter.ledeEn ?? chapter.lede} />
        </p>
      )}
      <p className="v3-cover__byline">
        <T
          zh={formatByline(chapter.readTime, chapter.revisions, "zh")}
          en={formatByline(chapter.readTime, chapter.revisions, "en")}
        />
      </p>
      <ChapterActions
        bookSlug={book.slug}
        bookTitle={book.title}
        number={number}
        chapterSlug={chapter.slug}
        chapterTitle={chapter.title}
        lede={chapter.lede}
        posterVersion={chapterModifiedAt(book, chapter)}
      />
      <hr className="v3-cover__rule" />
    </section>
  );
}
