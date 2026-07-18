"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/* next-themes owns localStorage + prefers-color-scheme + the no-FOUC
   inline script. v3.css keys off `:root[data-theme="dark"]`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      storageKey="kimi:theme"
    >
      {children}
    </NextThemesProvider>
  );
}
