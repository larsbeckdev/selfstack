import type { Tile } from "@/generated/prisma/client";

export type TileSize = "small" | "default" | "large" | "list";

/** Column × row span inside the group's sub-grid for a given tile size. */
export const TILE_SIZE_SPANS: Record<
  Exclude<TileSize, "list">,
  { w: number; h: number }
> = {
  small: { w: 1, h: 1 },
  default: { w: 2, h: 2 },
  large: { w: 4, h: 4 },
};

export function getTileSize(tile: Pick<Tile, "size">): TileSize {
  const s = tile.size as TileSize | null | undefined;
  if (s === "small" || s === "default" || s === "large" || s === "list")
    return s;
  return "default";
}

/**
 * Resolve actual column/row spans for a tile given the parent group's sub-grid
 * width (in columns). List tiles always span the full group row.
 */
export function getTileSpans(
  tile: Pick<Tile, "size">,
  groupCols: number,
): { colSpan: number; rowSpan: number; isList: boolean } {
  const size = getTileSize(tile);
  if (size === "list") {
    return { colSpan: groupCols, rowSpan: 1, isList: true };
  }
  const { w, h } = TILE_SIZE_SPANS[size];
  return {
    colSpan: Math.min(w, Math.max(1, groupCols)),
    rowSpan: h,
    isList: false,
  };
}
