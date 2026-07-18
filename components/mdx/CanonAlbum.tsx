import { cloneElement, Fragment } from "react";
import { T } from "@/components/T";
import { CANON_FIGURES, type Loc } from "./canon-figures";

function LocalizedText({ value }: { value: Loc }) {
  return <T zh={value.zh} en={value.en} />;
}

function StepText({ text }: { text: string }) {
  return (
    <>
      {text.split("→").map((segment, index) => (
        <Fragment key={`${segment}-${index}`}>
          {index > 0 && (
            <span className="ar" aria-hidden="true">
              →
            </span>
          )}
          <span className="seg">{segment.trim()}</span>
        </Fragment>
      ))}
    </>
  );
}

function LocalizedSteps({ value }: { value: Loc }) {
  return <T zh={<StepText text={value.zh} />} en={<StepText text={value.en} />} />;
}

export function CanonAlbum({ id }: { id: string }) {
  const album = CANON_FIGURES[id];
  if (!album) return null;

  const multi = album.items.length > 1;
  const total = String(album.items.length).padStart(2, "0");

  return (
    <figure className="album v3-carousel" data-carousel data-active="0">
      <div className="figcard">
        <button
          className="figcard-zoom mono"
          type="button"
          data-lightbox-open
          aria-label="放大查看图解 / Enlarge figure"
        >
          <T zh="放大" en="Zoom" /> <span aria-hidden="true">⤢</span>
        </button>
        {album.items.map((figure, index) => {
          const count = String(index + 1).padStart(2, "0");
          return (
            <div
              className={`figcard-slide${index === 0 ? " is-active" : ""}`}
              data-carousel-slide
              aria-hidden={index === 0 ? undefined : true}
              key={`${id}-${figure.category}`}
            >
              <div className="figcard-body">
                <div className="figcard-head">
                  <p className="figcard-eyebrow mono">
                    {multi ? `— ${count} / ${total} · ${figure.category}` : `— ${figure.category}`}
                  </p>
                  <h3 className="figcard-title">
                    <LocalizedText value={figure.title} />
                  </h3>
                  <p className="figcard-sub">
                    <LocalizedText value={figure.sub} />
                  </p>
                </div>
                <div className="figcard-art">
                  {cloneElement(figure.art, {
                    "aria-label": `${figure.title.zh} / ${figure.title.en} — ${figure.steps.zh} / ${figure.steps.en}`,
                  })}
                </div>
              </div>
              <div className="figcard-strip">
                <p className="figcard-steps mono">
                  <LocalizedSteps value={figure.steps} />
                </p>
                <button
                  className="figcard-export mono"
                  type="button"
                  data-export-canon-figure
                  data-label-idle-zh="导出图片"
                  data-label-idle-en="Export image"
                  data-label-busy-zh="正在导出"
                  data-label-busy-en="Exporting"
                  data-label-done-zh="已导出"
                  data-label-done-en="Exported"
                  data-label-failed-zh="导出失败"
                  data-label-failed-en="Failed"
                >
                  <T zh="导出图片" en="Export image" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {multi && (
        <div className="figcard-controls">
          <button
            className="figcard-nav"
            type="button"
            data-carousel-prev
            aria-label="上一张 / Previous"
            disabled
          >
            <span aria-hidden="true">←</span>
          </button>
          <span className="figcard-counter mono" data-carousel-counter aria-live="polite">
            {`01 / ${total}`}
          </span>
          <button className="figcard-nav" type="button" data-carousel-next aria-label="下一张 / Next">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </figure>
  );
}
