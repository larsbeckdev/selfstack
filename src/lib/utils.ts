import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a #rgb / #rrggbb hex color into #rrggbbAA with the given alpha (0..1).
 * Returns undefined for falsy / invalid input so callers can fall back to theme defaults.
 */
export function withAlpha(
  color: string | null | undefined,
  alpha: number,
): string | undefined {
  if (!color) return undefined;
  let hex = color.trim();
  if (!hex.startsWith("#")) return undefined;
  hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  // Strip any existing alpha channel — we replace it with the provided alpha.
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${a}`;
}

/**
 * Pick a readable foreground (black or white) for a given hex background.
 * Uses the relative-luminance formula. Returns undefined for invalid input.
 */
export function readableTextColor(
  bg: string | null | undefined,
): "#000000" | "#ffffff" | undefined {
  if (!bg) return undefined;
  let hex = bg.trim();
  if (!hex.startsWith("#")) return undefined;
  hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.55 ? "#000000" : "#ffffff";
}
