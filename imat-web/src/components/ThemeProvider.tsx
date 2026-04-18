"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

// In newer next-themes versions, type is exported from root or we can just use React.ComponentProps
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
