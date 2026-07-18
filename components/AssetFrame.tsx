import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";

type AssetFrameProps = {
  className: string;
  src?: string;
  available?: boolean;
  alt: string;
  /** Text-only placeholder label. Prefer `fallback` for rich content. */
  placeholder?: ReactNode;
  /** Rich fallback rendered when the asset is unavailable (e.g. CoverArt SVG). */
  fallback?: ReactNode;
  fit?: "cover" | "contain";
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
};

export function AssetFrame({
  className,
  src,
  available = false,
  alt,
  placeholder,
  fallback,
  fit = "cover",
  sizes = "100vw",
  priority = false,
  style,
}: AssetFrameProps) {
  const hasImage = Boolean(src && available);
  const isSvg = src ? /\.svg(?:[?#]|$)/i.test(src) : false;
  const classes = [
    className,
    "asset-frame",
    `asset-frame--${fit}`,
    hasImage ? "has-image" : "is-placeholder",
  ].join(" ");

  return (
    <div
      className={classes}
      role={hasImage ? undefined : "img"}
      aria-label={hasImage ? undefined : alt}
      style={style}
    >
      {hasImage && src ? (
        isSvg ? (
          // next/image refuses bare SVG, and the optimizer adds nothing to
          // vector art anyway. Render a sized <img> that fills the ratio box —
          // the container already reserves space, so CLS stays at zero. Matches
          // the website's <ContentImage> SVG path.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="asset-frame__image"
            src={src}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: fit }}
          />
        ) : (
          <Image
            className="asset-frame__image"
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
          />
        )
      ) : fallback ? (
        fallback
      ) : placeholder ? (
        <span className="asset-frame__label">{placeholder}</span>
      ) : null}
    </div>
  );
}
