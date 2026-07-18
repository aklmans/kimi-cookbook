import Link from "next/link";
import type { BookMeta } from "@/lib/types";
import { bookDateShort } from "@/lib/books";
import { T } from "@/components/T";
import { AssetFrame } from "@/components/AssetFrame";
import { publicAssetExists } from "@/lib/public-assets";
import { bookCoverArt } from "@/lib/cover-art";
import { StopPunct } from "./StopPunct";

/* `.next-book` — README CSS-class map. ChapterShell renders this only
   when the chapter's `isLastChapter` flag is set. */
export function NextBook({
  book,
  previousBook,
}: {
  book: BookMeta;
  previousBook?: BookMeta | null;
}) {
  const coverAvailable = publicAssetExists(book.cover);

  return (
    <section className="next-book" aria-label="下一本推荐 / Next book recommendation">
      <p className="next-book__eyebrow">
        — <T zh="读完了 · 试试这本" en="Finished? Try This Next" />
      </p>
      <Link className="next-book__card" href={`/books/${book.slug}`}>
        <AssetFrame
          className="next-book__cover"
          src={book.cover}
          available={coverAvailable}
          alt={`${book.title} / ${book.titleEn} cover`}
          fallback={bookCoverArt(book)}
          sizes="88px"
        />
        <div className="next-book__body">
          <h3 className="next-book__title">
            <T zh={book.title} en={book.titleEn} />
            <StopPunct />
          </h3>
          <p className="next-book__lede">
            <T zh={book.description} en={book.descriptionEn} />
          </p>
          <p className="next-book__meta">
            <T
              zh={`${book.chapters.length} 章 · ${book.readMinutes} 分钟`}
              en={`${book.chapters.length} Chapters · ${book.readMinutes} Min`}
            />{" "}
            · {bookDateShort(book.date)}
          </p>
        </div>
      </Link>
      {previousBook && (
        <p className="next-book__backlink">
          <Link href={`/books/${previousBook.slug}`}>
            <T
              zh={`← 上一本：${previousBook.title}`}
              en={`← Previous book: ${previousBook.titleEn}`}
            />
          </Link>
        </p>
      )}
    </section>
  );
}
