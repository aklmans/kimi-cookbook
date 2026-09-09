"use client";

import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { T } from "./T";

/* "复制完整 Prompt" button for the monthly artifact cards. */
export function CopyPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(prompt);
    if (ok) {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      className="monthly-prompt__btn"
      onClick={handleCopy}
      aria-label={copied ? "已复制 / Copied" : "复制提示词 / Copy Prompt"}
    >
      {copied ? (
        <span className="monthly-prompt__btn-active">
          ✓ <T zh="已复制到剪贴板" en="Copied to clipboard" />
        </span>
      ) : (
        <span>
          <T zh="复制完整 Prompt" en="Copy Full Prompt" />
        </span>
      )}
    </button>
  );
}
