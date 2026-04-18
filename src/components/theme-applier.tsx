"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { themePresets } from "@/lib/theme-presets";

const THEME_STORAGE_KEY = "selfstack-theme-preset";
const CUSTOM_COLORS_KEY = "selfstack-custom-colors";

function applyThemeColors(colors: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value);
  }
}

function clearThemeColors() {
  const root = document.documentElement;
  const vars = [
    "background",
    "foreground",
    "card",
    "card-foreground",
    "popover",
    "popover-foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "secondary-foreground",
    "muted",
    "muted-foreground",
    "accent",
    "accent-foreground",
    "destructive",
    "border",
    "input",
    "ring",
    "sidebar",
    "sidebar-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
  ];
  for (const v of vars) {
    root.style.removeProperty(`--${v}`);
  }
}

/**
 * Global component that applies the saved theme preset colors on every page.
 * Must be mounted in the root layout so it runs on all routes.
 */
export function ThemeApplier() {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const applyTheme = useCallback(() => {
    if (!mounted) return;

    const presetKey = localStorage.getItem(THEME_STORAGE_KEY) ?? "default";
    const customRaw = localStorage.getItem(CUSTOM_COLORS_KEY);
    let custom: Record<string, string> = {};
    if (customRaw) {
      try {
        custom = JSON.parse(customRaw);
      } catch {}
    }

    const preset = themePresets[presetKey];
    if (!preset || presetKey === "default") {
      clearThemeColors();
      if (Object.keys(custom).length > 0) {
        applyThemeColors(custom);
      }
      return;
    }

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const colors = { ...preset.colors[mode], ...custom };
    applyThemeColors(colors);
  }, [resolvedTheme, mounted]);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Listen for storage changes (cross-tab) and custom event (same-tab)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY || e.key === CUSTOM_COLORS_KEY) {
        applyTheme();
      }
    };
    const customHandler = () => applyTheme();
    window.addEventListener("storage", handler);
    window.addEventListener("selfstack-theme-change", customHandler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("selfstack-theme-change", customHandler);
    };
  }, [applyTheme]);

  return null;
}
