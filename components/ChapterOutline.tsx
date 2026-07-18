import type { ChapterOutlineItem } from "@/lib/chapter-outline";
import { T } from "./T";

export function ChapterOutline({ items }: { items: ChapterOutlineItem[] }) {
  if (items.length < 2) return null;

  return (
    <div className="chapter-outline-shell" data-chapter-outline>
      <ul
        className="chapter-outline-rail"
        aria-label="章内目录轨道 / Chapter outline rail"
      >
        {items.map((item) => (
          <li
            className={`chapter-outline-rail__item chapter-outline-rail__item--level-${item.level}`}
            key={`rail-${item.id}`}
          >
            <a
              className="chapter-outline-marker"
              href={`#${item.id}`}
              aria-label={`${item.titleZh} / ${item.titleEn}`}
              data-depth={item.level}
              data-target={item.id}
            />
          </li>
        ))}
      </ul>
      <aside
        className="chapter-outline"
        data-chapter-outline-panel
        aria-label="章内目录 / Table of contents"
      >
        <div className="chapter-outline__inner">
          <div className="chapter-outline__head">
            <p className="chapter-outline__label">
              <T zh="章内目录" en="TOC" />
            </p>
            <div className="chapter-outline__actions">
              <button
                className="chapter-outline__pin"
                type="button"
                data-outline-pin
                data-pin-label="固定章内目录 / Pin outline"
                data-unpin-label="取消固定章内目录 / Unpin outline"
                aria-label="固定章内目录 / Pin outline"
                aria-pressed="false"
                title="固定章内目录 / Pin outline"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="13"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                  viewBox="0 0 24 24"
                  width="13"
                >
                  <path d="M12 17v5" />
                  <path d="M9 3h6l-1 7 3 3v2H7v-2l3-3z" />
                </svg>
              </button>
              <button
                className="chapter-outline__toggle"
                type="button"
                data-outline-close
                aria-keyshortcuts="O"
                aria-label="关闭章内目录 / Close chapter outline"
              >
                ×
              </button>
            </div>
          </div>
          <ol className="chapter-outline__list">
            {items.map((item) => (
              <li
                className={`chapter-outline__item chapter-outline__item--level-${item.level}`}
                key={item.id}
              >
                <a className="chapter-outline__link" href={`#${item.id}`}>
                  <T zh={item.titleZh} en={item.titleEn} />
                </a>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
