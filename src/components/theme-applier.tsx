"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { themePresets } from "@/lib/theme-presets";

export type ThemeChangeDetail = {
  preset?: string;
  customColors?: Record<string, string> | null;
};

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
 * Initial values come from the server-rendered layout (DB-backed), but they
 * are kept in client state so in-app changes (via the theme customizer)
 * persist across dark/light toggles without a page reload.
 *
 * The customizer dispatches a `selfstack-theme-change` CustomEvent with the
 * new preset / custom colors in `event.detail` so this component can pick
 * them up immediately.
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

  const [currentPreset, setCurrentPreset] = useState<string>(preset);
  const [currentCustom, setCurrentCustom] = useState<Record<string, string>>(
    () => {
      if (!customColors) return {};
      try {
        return JSON.parse(customColors) as Record<string, string>;
      } catch {
        return {};
      }
    },
  );

  const applyTheme = useCallback(() => {
    if (!mounted) return;

    const presetData = themePresets[currentPreset];
    if (!presetData || currentPreset === "default") {
      clearThemeColors();
      if (Object.keys(currentCustom).length > 0) {
        applyThemeColors(currentCustom);
      }
      return;
    }

    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const colors = { ...presetData.colors[mode], ...currentCustom };
    applyThemeColors(colors);
  }, [resolvedTheme, mounted, currentPreset, currentCustom]);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Listen for in-app theme changes (from the customizer). The event's detail
  // carries the latest preset and custom colors, which become our new state.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ThemeChangeDetail>).detail;
      if (!detail) return;
      if (typeof detail.preset === "string") {
        setCurrentPreset(detail.preset);
      }
      if (detail.customColors !== undefined) {
        setCurrentCustom(detail.customColors ?? {});
      }
    };
    window.addEventListener("selfstack-theme-change", handler);
    return () => window.removeEventListener("selfstack-theme-change", handler);
  }, []);

  return null;
}
