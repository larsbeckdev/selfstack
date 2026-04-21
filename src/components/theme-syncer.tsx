"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { setUserTheme } from "@/lib/actions/settings";

/**
 * Listens for theme changes from next-themes and persists them to the DB.
 * Skips the initial render so we don't round-trip the hydrated value.
 */
export function ThemeSyncer({ initialTheme }: { initialTheme: string }) {
  const { theme } = useTheme();
  const lastSynced = useRef<string | null>(initialTheme);

  useEffect(() => {
    if (!theme) return;
    if (theme === lastSynced.current) return;
    lastSynced.current = theme;
    setUserTheme(theme).catch(() => {
      // ignore — persistence is best-effort
    });
  }, [theme]);

  return null;
}
