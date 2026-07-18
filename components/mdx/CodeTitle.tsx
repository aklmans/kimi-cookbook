import type { ReactNode } from "react";

export function CodeTitle({ children }: { children: ReactNode }) {
  if (children === null || children === undefined || children === "") {
    return null;
  }

  return (
    <figcaption className="v3-codeblock__title" data-rehype-pretty-code-title>
      {children}
    </figcaption>
  );
}
