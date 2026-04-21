import type { Tile } from "@/generated/prisma/client";

/** Tile size options. Each maps to a fixed grid footprint. */
export type TileSize = "small" | "default" | "large";

/** Tile spans in the group's inner grid. small=1×1, default=2×2, large=4×4. */
export const TILE_SPANS: Record<TileSize, { w: number; h: number }> = {
  small: { w: 1, h: 1 },
  default: { w: 2, h: 2 },
  large: { w: 4, h: 4 },
};

export function getTileSize(tile: Pick<Tile, "size">): TileSize {
  const s = tile.size as TileSize | null | undefined;
  if (s === "small" || s === "default" || s === "large") return s;
  return "default";
}

/** Grid/list layout of a group's tile list. */
export type GroupLayoutMode = "grid" | "list" | "snap";

export function getGroupLayout(group: {
  layout?: string | null;
}): GroupLayoutMode {
  if (group.layout === "list") return "list";
  if (group.layout === "snap") return "snap";
  return "grid";
}

/** Fixed number of columns inside every group's grid layout. */
export const INNER_COLS = 6;

/** Row height (in px) for each cell in the group's inner grid. */
export const INNER_ROW_PX = 56;

/** Category width is a span in the top-level 4-column grid. */
export const CATEGORY_COLS = 4;
export const CATEGORY_WIDTHS = [1, 2, 3, 4] as const;
export type CategoryWidth = (typeof CATEGORY_WIDTHS)[number];

export function getCategoryWidth(w: number | null | undefined): CategoryWidth {
  if (w === 1 || w === 2 || w === 3 || w === 4) return w;
  return 4;
}
