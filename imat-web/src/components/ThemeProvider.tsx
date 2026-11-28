"use client";

import * as React from "react";

export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Exclude<Theme, "system">;
};

type ThemeContextValue = {
  /** The user's stored choice: light, dark, or follow the OS. */
  theme: Theme;
  /** The theme actually applied right now (system resolved). */
  resolvedTheme: Exclude<Theme, "system">;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function systemTheme(): Exclude<Theme, "system"> {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function storedChoice(fallback: Exclude<Theme, "system">): Theme {
  const stored = window.localStorage.getItem("theme");
  if (stored === "dark" || stored === "light" || stored === "system") return stored;
  return fallback;
}

export function ThemeProvider({ children, defaultTheme = "light" }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<Exclude<Theme, "system">>(defaultTheme);

  // First load: stored choice wins, otherwise the light default.
  React.useEffect(() => {
    setThemeState(storedChoice(defaultTheme));
  }, [defaultTheme]);

  // Resolve "system" against the OS preference, and follow OS changes
  // while system is selected.
  React.useEffect(() => {
    const apply = () => setResolvedTheme(theme === "system" ? systemTheme() : theme);
    apply();
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    window.localStorage.setItem("theme", theme);
  }, [theme, resolvedTheme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme: setThemeState }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
