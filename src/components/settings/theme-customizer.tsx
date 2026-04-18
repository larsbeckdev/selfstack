"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Check, Moon, Sun, Monitor, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { themePresets } from "@/lib/theme-presets";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  saveThemePreference,
  getThemePreference,
} from "@/lib/actions/settings";

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

function ThemePreview({
  colors,
  label,
  isActive,
  onClick,
}: {
  colors: { light: Record<string, string>; dark: Record<string, string> };
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const light = colors.light;
  const dark = colors.dark;
  const isDefault = Object.keys(light).length === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-lg border-2 p-2 text-left transition-all hover:shadow-md",
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50",
      )}>
      {isActive && (
        <div className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </div>
      )}
      <div className="flex gap-1 overflow-hidden rounded-md">
        {/* Light preview */}
        <div
          className="flex h-16 flex-1 flex-col gap-0.5 rounded-l p-1.5"
          style={{
            backgroundColor: isDefault ? "#ffffff" : light.background,
            color: isDefault ? "#333333" : light.foreground,
          }}>
          <div
            className="h-1.5 w-8 rounded-full"
            style={{
              backgroundColor: isDefault ? "#3b82f6" : light.primary,
            }}
          />
          <div
            className="h-1 w-6 rounded-full opacity-40"
            style={{
              backgroundColor: isDefault ? "#333333" : light.foreground,
            }}
          />
          <div className="mt-auto flex gap-0.5">
            <div
              className="h-2 w-4 rounded-sm"
              style={{
                backgroundColor: isDefault ? "#f3f4f6" : light.secondary,
              }}
            />
            <div
              className="h-2 w-4 rounded-sm"
              style={{
                backgroundColor: isDefault ? "#e0f2fe" : light.accent,
              }}
            />
          </div>
        </div>
        {/* Dark preview */}
        <div
          className="flex h-16 flex-1 flex-col gap-0.5 rounded-r p-1.5"
          style={{
            backgroundColor: isDefault
              ? "#171717"
              : dark.background || "#171717",
            color: isDefault ? "#e5e5e5" : dark.foreground || "#e5e5e5",
          }}>
          <div
            className="h-1.5 w-8 rounded-full"
            style={{
              backgroundColor: isDefault
                ? "#3b82f6"
                : dark.primary || light.primary,
            }}
          />
          <div
            className="h-1 w-6 rounded-full opacity-40"
            style={{
              backgroundColor: isDefault
                ? "#e5e5e5"
                : dark.foreground || "#e5e5e5",
            }}
          />
          <div className="mt-auto flex gap-0.5">
            <div
              className="h-2 w-4 rounded-sm"
              style={{
                backgroundColor: isDefault
                  ? "#262626"
                  : dark.secondary || "#262626",
              }}
            />
            <div
              className="h-2 w-4 rounded-sm"
              style={{
                backgroundColor: isDefault
                  ? "#1e3a8a"
                  : dark.accent || "#1e3a8a",
              }}
            />
          </div>
        </div>
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

const colorEditorVars = [
  { key: "primary", label: "Primär" },
  { key: "primary-foreground", label: "Primär Text" },
  { key: "background", label: "Hintergrund" },
  { key: "foreground", label: "Text" },
  { key: "card", label: "Karte" },
  { key: "card-foreground", label: "Karte Text" },
  { key: "secondary", label: "Sekundär" },
  { key: "secondary-foreground", label: "Sekundär Text" },
  { key: "muted", label: "Gedämpft" },
  { key: "muted-foreground", label: "Gedämpft Text" },
  { key: "accent", label: "Akzent" },
  { key: "accent-foreground", label: "Akzent Text" },
  { key: "destructive", label: "Destruktiv" },
  { key: "border", label: "Rahmen" },
  { key: "input", label: "Eingabe" },
  { key: "ring", label: "Ring" },
] as const;

export function ThemeCustomizer() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [activePreset, setActivePreset] = useState<string>(() => {
    if (typeof window === "undefined") return "default";
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved && saved in themePresets ? saved : "default";
  });
  const [customColors, setCustomColors] = useState<Record<string, string>>(
    () => {
      if (typeof window === "undefined") return {};
      const savedCustom = localStorage.getItem(CUSTOM_COLORS_KEY);
      if (savedCustom) {
        try {
          return JSON.parse(savedCustom);
        } catch {}
      }
      return {};
    },
  );

  // Load theme from DB on mount
  useEffect(() => {
    getThemePreference()
      .then(({ themePreset, customColors: dbColors }) => {
        if (themePreset && themePreset in themePresets) {
          setActivePreset(themePreset);
          localStorage.setItem(THEME_STORAGE_KEY, themePreset);
        }
        if (dbColors) {
          try {
            const parsed = JSON.parse(dbColors);
            setCustomColors(parsed);
            localStorage.setItem(CUSTOM_COLORS_KEY, dbColors);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Apply theme colors when preset or mode changes
  const applyCurrentTheme = useCallback(() => {
    if (!mounted) return;
    const preset = themePresets[activePreset];
    if (!preset || activePreset === "default") {
      clearThemeColors();
      // Re-apply custom overrides
      if (Object.keys(customColors).length > 0) {
        applyThemeColors(customColors);
      }
      return;
    }
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    const colors = { ...preset.colors[mode], ...customColors };
    applyThemeColors(colors);
  }, [activePreset, resolvedTheme, mounted, customColors]);

  useEffect(() => {
    applyCurrentTheme();
  }, [applyCurrentTheme]);

  const notifyThemeChange = () => {
    window.dispatchEvent(new Event("selfstack-theme-change"));
  };

  const selectPreset = (key: string) => {
    setActivePreset(key);
    setCustomColors({});
    localStorage.setItem(THEME_STORAGE_KEY, key);
    localStorage.removeItem(CUSTOM_COLORS_KEY);
    notifyThemeChange();
    saveThemePreference(key, null).catch(() => {});
    toast.success(`Theme "${themePresets[key].label}" aktiviert`);
  };

  const handleColorChange = (varName: string, value: string) => {
    const next = { ...customColors, [varName]: value };
    setCustomColors(next);
    const serialized = JSON.stringify(next);
    localStorage.setItem(CUSTOM_COLORS_KEY, serialized);
    applyThemeColors({ [varName]: value });
    notifyThemeChange();
    saveThemePreference(activePreset, serialized).catch(() => {});
  };

  const resetCustomColors = () => {
    setCustomColors({});
    localStorage.removeItem(CUSTOM_COLORS_KEY);
    applyCurrentTheme();
    notifyThemeChange();
    saveThemePreference(activePreset, null).catch(() => {});
    toast.success("Farbanpassungen zurückgesetzt");
  };

  if (!mounted) return null;

  const currentMode = resolvedTheme === "dark" ? "dark" : "light";
  const presetColors =
    activePreset !== "default"
      ? (themePresets[activePreset]?.colors[currentMode] ?? {})
      : {};

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Erscheinungsbild</CardTitle>
          <CardDescription>
            Wähle zwischen hellem, dunklem oder System-Modus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}>
              <Sun className="mr-2 size-4" />
              Hell
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}>
              <Moon className="mr-2 size-4" />
              Dunkel
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}>
              <Monitor className="mr-2 size-4" />
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Theme Vorlagen</CardTitle>
          <CardDescription>
            Wähle ein vorgefertigtes Farbschema — inspiriert von tweakcn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(themePresets).map(([key, preset]) => (
              <ThemePreview
                key={key}
                colors={preset.colors}
                label={preset.label}
                isActive={activePreset === key}
                onClick={() => selectPreset(key)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Customizer */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Farben anpassen</CardTitle>
            <CardDescription>
              Passe einzelne Farben individuell an (
              {currentMode === "dark" ? "Dunkel" : "Hell"}-Modus)
            </CardDescription>
          </div>
          {Object.keys(customColors).length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetCustomColors}>
              <RotateCcw className="mr-2 size-3.5" />
              Zurücksetzen
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {colorEditorVars.map(({ key, label }) => {
              const currentValue =
                customColors[key] ||
                presetColors[key] ||
                getComputedStyle(document.documentElement)
                  .getPropertyValue(`--${key}`)
                  .trim();
              return (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      currentValue.startsWith("#") ? currentValue : "#888888"
                    }
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <Label className="text-xs">{label}</Label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
