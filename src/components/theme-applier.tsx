"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { themePresets } from "@/lib/theme-presets";

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
 * Values come from the server-rendered layout (DB-backed). A same-tab custom
 * event (`selfstack-theme-change`) lets the theme customizer trigger a refresh
 * when the user picks a new preset / tweaks colors.
 */
export function ThemeApplier({
  preset = "default",
  customColors = null,
}: {
  preset?: string;
  customColors?: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const applyTheme = useCallback(() => {
    if (!mounted) return;

    let custom: Record<string, string> = {};
    if (customColors) {
      try {
        custom = JSON.parse(customColors);
      } catch {}
    }

    const presetData = themePresets[preset];
    if (!presetData || preset === "default") {
      clearThemeColors();
      if (Object.keys(custom).length > 0) {
        applyThemeColors(custom);
      }
      return;
    }

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const colors = { ...presetData.colors[mode], ...custom };
    applyThemeColors(colors);
  }, [resolvedTheme, mounted, preset, customColors]);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Let the theme customizer notify us when it applies a new preset/custom
  // color directly to the DOM (same tab). No storage events needed.
  useEffect(() => {
    const handler = () => applyTheme();
    window.addEventListener("selfstack-theme-change", handler);
    return () => window.removeEventListener("selfstack-theme-change", handler);
  }, [applyTheme]);

  return null;
}
