/* Ported verbatim in spirit from assets/v3.js — async Clipboard API with
   an execCommand fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through to legacy */
    }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    const prevFocus = document.activeElement as HTMLElement | null;
    ta.focus();
    ta.select();
    const ok = !!(document.execCommand && document.execCommand("copy"));
    document.body.removeChild(ta);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    return ok;
  } catch {
    return false;
  }
}
