import type { Chapter } from "@/lib/types";
import { formatByline } from "@/lib/format";
import { T } from "@/components/T";
import { StopPunct } from "./StopPunct";

/* Replaces the MDX body for chapters flagged with `draft: true` in
   their meta.ts entry. Renders the chapter cover (eyebrow + title +
   lede) like a normal chapter, then a centered editorial notice
   instead of the body. The chapter still appears in the book TOC so
   the reader sees the planned structure. */
export function DraftNotice({
  chapter,
  number,
}: {
  chapter: Chapter;
  number: string;
}) {
  const n = parseInt(number, 10);
  const title = chapter.coverTitle ?? chapter.title;
  const titleEn = chapter.coverTitleEn ?? chapter.titleEn;
  return (
    <>
      <section className="v3-cover v3-cover--chapter">
        <p className="v3-cover__eyebrow">
          — {number} /{" "}
          <T zh={`第 ${n} 章`} en={`Chapter ${n}`} />
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
        <hr className="v3-cover__rule" />
      </section>

      <aside className="v3-chapter-draft" aria-label="本章节为草稿 / Chapter is a draft">
        <p className="v3-chapter-draft__label">— <T zh="撰写中" en="Draft in Progress" /></p>
        <h2 className="v3-chapter-draft__title">
          <T zh="本章节正文还在撰写中" en="This chapter is still being drafted" />
          <StopPunct />
        </h2>
        <p className="v3-chapter-draft__body">
          <T
            zh="书的整体框架与目录已经定下来; 章节正文会陆续补全。回到目录看看其它已发布的章节, 或者过段时间再回来。"
            en="The book's structure and outline are set; the per-chapter prose lands progressively. Browse the table of contents for already-published chapters, or check back later."
          />
        </p>
      </aside>
    </>
  );
}
