import { SITE_YEAR } from "@/lib/site";

/* `.v3-footer` — README CSS-class map. Server component.
   The chapter variant shows page numbers on the left
   (`<NN> / <total>`); every other page shows "Zhapar · <year>". */
export function SiteFooter({
  pages,
}: {
  pages?: { current: string; total: number };
}) {
  return (
    <footer className="v3-footer">
      {pages ? (
        <span className="v3-footer__pages">
          <span className="accent">{pages.current}</span> / {pages.total}
        </span>
      ) : (
        <span>Zhapar · {SITE_YEAR}</span>
      )}
      <span className="v3-footer__motto">Think clearly. Build with Kimi.</span>
      <span className="v3-footer__right">
        <a href="https://x.com/ak_zhaphar">Twitter</a>
        <a href="https://github.com/aklmans/kimi-cookbook">GitHub</a>
        <a href="/feed.xml">RSS</a>
        <a href="/license">License</a>
      </span>
    </footer>
  );
}
