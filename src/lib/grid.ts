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

/** Grid/list layout of a group's tile list. Only "snap" and "list" are offered in the UI. */
export type GroupLayoutMode = "list" | "snap";

export function getGroupLayout(group: {
  layout?: string | null;
}): GroupLayoutMode {
  if (group.layout === "list") return "list";
  return "snap";
}

/** Fixed number of columns inside every group's grid layout (fallback / max). */
export const INNER_COLS = 16;

/** Row height (in px) for each cell in the group's inner grid. */
export const INNER_ROW_PX = 56;

/** Number of columns inside a category for positioning groups. */
export const GROUP_COLS = 2;

/**
 * Number of tile columns inside a full-width group, scaled by the owning
 * category's board-width. A 1/4 category gets 4 columns, 2/4 → 6, 3/4 → 8,
 * 4/4 → 12.
 */
export function getCategoryInnerCols(w: CategoryWidth): number {
  switch (w) {
    case 1:
      return 4;
    case 2:
      return 6;
    case 3:
      return 8;
    case 4:
    default:
      return 12;
  }
}

/** Group width is a span in the category's 2-column layout grid. */
export const GROUP_WIDTHS = [1, 2] as const;
export type GroupWidth = (typeof GROUP_WIDTHS)[number];

export function getGroupWidth(w: number | null | undefined): GroupWidth {
  if (w === 1) return 1;
  return 2;
}

/**
 * Tile columns available inside a group, derived from the category's
 * full-width tile columns and the group's width (1 = half, 2 = full).
 * Half-width groups get half the columns (rounded down, min 1).
 */
export function getGroupTileCols(
  catTileCols: number,
  groupW: GroupWidth,
): number {
  if (groupW === 2) return catTileCols;
  return Math.max(1, Math.floor(catTileCols / 2));
}

/** Category width is a span in the top-level 4-column grid. */
export const CATEGORY_COLS = 4;
export const CATEGORY_WIDTHS = [1, 2, 3, 4] as const;
export type CategoryWidth = (typeof CATEGORY_WIDTHS)[number];

export function getCategoryWidth(w: number | null | undefined): CategoryWidth {
  if (w === 1 || w === 2 || w === 3 || w === 4) return w;
  return 4;
}
