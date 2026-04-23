/**
 * Curated palette of shadcn/tailwind v3 named colors for surfaces
 * (e.g. group/tile backgrounds). Each entry carries the raw tailwind
 * name plus a light+dark hex pair so surfaces render correctly in
 * both themes without needing the JIT to see dynamic classes.
 */
export type ShadcnColorName =
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

export type ShadcnSurface = {
  /** Value stored in the DB, e.g. "slate-100". */
  id: string;
  name: ShadcnColorName;
  label: string;
  /** Background color for light mode. */
  light: string;
  /** Background color for dark mode. */
  dark: string;
};

/** Tailwind v3 colors — 100 shade for light mode, 900 for dark mode. */
export const SHADCN_SURFACES: ShadcnSurface[] = [
  {
    id: "slate-100",
    name: "slate",
    label: "Slate",
    light: "#f1f5f9",
    dark: "#0f172a",
  },
  {
    id: "gray-100",
    name: "gray",
    label: "Gray",
    light: "#f3f4f6",
    dark: "#111827",
  },
  {
    id: "zinc-100",
    name: "zinc",
    label: "Zinc",
    light: "#f4f4f5",
    dark: "#18181b",
  },
  {
    id: "neutral-100",
    name: "neutral",
    label: "Neutral",
    light: "#f5f5f5",
    dark: "#171717",
  },
  {
    id: "stone-100",
    name: "stone",
    label: "Stone",
    light: "#f5f5f4",
    dark: "#1c1917",
  },
  {
    id: "red-100",
    name: "red",
    label: "Red",
    light: "#fee2e2",
    dark: "#450a0a",
  },
  {
    id: "orange-100",
    name: "orange",
    label: "Orange",
    light: "#ffedd5",
    dark: "#431407",
  },
  {
    id: "amber-100",
    name: "amber",
    label: "Amber",
    light: "#fef3c7",
    dark: "#451a03",
  },
  {
    id: "yellow-100",
    name: "yellow",
    label: "Yellow",
    light: "#fef9c3",
    dark: "#422006",
  },
  {
    id: "lime-100",
    name: "lime",
    label: "Lime",
    light: "#ecfccb",
    dark: "#1a2e05",
  },
  {
    id: "green-100",
    name: "green",
    label: "Green",
    light: "#dcfce7",
    dark: "#052e16",
  },
  {
    id: "emerald-100",
    name: "emerald",
    label: "Emerald",
    light: "#d1fae5",
    dark: "#022c22",
  },
  {
    id: "teal-100",
    name: "teal",
    label: "Teal",
    light: "#ccfbf1",
    dark: "#042f2e",
  },
  {
    id: "cyan-100",
    name: "cyan",
    label: "Cyan",
    light: "#cffafe",
    dark: "#083344",
  },
  {
    id: "sky-100",
    name: "sky",
    label: "Sky",
    light: "#e0f2fe",
    dark: "#082f49",
  },
  {
    id: "blue-100",
    name: "blue",
    label: "Blue",
    light: "#dbeafe",
    dark: "#172554",
  },
  {
    id: "indigo-100",
    name: "indigo",
    label: "Indigo",
    light: "#e0e7ff",
    dark: "#1e1b4b",
  },
  {
    id: "violet-100",
    name: "violet",
    label: "Violet",
    light: "#ede9fe",
    dark: "#2e1065",
  },
  {
    id: "purple-100",
    name: "purple",
    label: "Purple",
    light: "#f3e8ff",
    dark: "#3b0764",
  },
  {
    id: "fuchsia-100",
    name: "fuchsia",
    label: "Fuchsia",
    light: "#fae8ff",
    dark: "#4a044e",
  },
  {
    id: "pink-100",
    name: "pink",
    label: "Pink",
    light: "#fce7f3",
    dark: "#500724",
  },
  {
    id: "rose-100",
    name: "rose",
    label: "Rose",
    light: "#ffe4e6",
    dark: "#4c0519",
  },
];

export function getShadcnSurface(
  id: string | null | undefined,
): ShadcnSurface | null {
  if (!id) return null;
  return SHADCN_SURFACES.find((s) => s.id === id) ?? null;
}

/**
 * Flat list of vibrant shadcn/tailwind color swatches (shade 500) for use
 * as quick-pick swatches in the color picker. One entry per hue.
 */
export const SHADCN_SWATCH_HEXES: string[] = [
  "#64748b", // slate
  "#6b7280", // gray
  "#71717a", // zinc
  "#737373", // neutral
  "#78716c", // stone
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
];
