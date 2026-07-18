/**
 * Bilingual aria-label wrapper.
 * Renders a `<span>` whose `aria-label` carries BOTH languages
 * ("中文 / English") plus the passed-through `role` and other attributes.
 *
 * The label is intentionally language-independent so it is identical on the
 * server and during hydration (an EN reader's pre-paint script flips
 * `data-lang`, which would make a `useLang()`-driven label mismatch the
 * server HTML). Screen readers get a correct name in either language mode.
 * Matches the static bilingual aria-label pattern used by ChapterOutline.
 */
export function AriaLabel({
  zh,
  en,
  role,
  ...rest
}: {
  zh: string;
  en: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return <span aria-label={`${zh} / ${en}`} role={role} {...rest} />;
}
