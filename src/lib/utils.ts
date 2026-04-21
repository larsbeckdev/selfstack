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
  if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) return undefined;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${a}`;
}
