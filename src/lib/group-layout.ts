import type { Tile } from "@/generated/prisma/client";
import { getTileSize, type TileSize } from "@/lib/tile-size";

/**
 * Group layout template — controls how tiles are arranged horizontally
 * inside a group. Groups always stack vertically in their category;
 * horizontal freedom is deliberately constrained to these templates.
 */
export type GroupLayout = "cols-1" | "cols-2" | "cols-3" | "auto" | "list";

export const GROUP_LAYOUTS: GroupLayout[] = [
  "auto",
  "cols-1",
  "cols-2",
  "cols-3",
  "list",
];

export function getGroupLayout(
  group: { layout?: string | null } | null | undefined,
): GroupLayout {
  const l = group?.layout as GroupLayout | null | undefined;
  if (
    l === "cols-1" ||
    l === "cols-2" ||
    l === "cols-3" ||
    l === "auto" ||
    l === "list"
  )
    return l;
  return "auto";
}

/** Fixed column count for the cols-N templates, or 0 for auto/list. */
export function getLayoutColumns(layout: GroupLayout): number {
  switch (layout) {
    case "cols-1":
      return 1;
    case "cols-2":
      return 2;
    case "cols-3":
      return 3;
    default:
      return 0;
  }
}

/**
 * Minimum track width (px) for an auto-fill grid — tuned so that
 * "default" tiles (2×2 in the old system) still look comfortable.
 */
export const AUTO_GRID_MIN_PX = 140;

/**
 * Given a group's layout and a tile's size, return the column span and
 * whether the tile should render in list mode. Rows always auto-size
 * (minmax 0,auto) so tiles flow naturally.
 */
export function getTilePlacement(
  tile: Pick<Tile, "size">,
  layout: GroupLayout,
): { colSpan: number; asList: boolean } {
  const size: TileSize = getTileSize(tile);

  // List layout: every tile renders as a list row.
  if (layout === "list") return { colSpan: 1, asList: true };

  // Auto grid: every tile occupies one auto track. To still give a
  // visual hierarchy without breaking the auto-fill reflow, we render
  // all sizes as one track and let the tile-card decide its appearance.
  if (layout === "auto") {
    return { colSpan: 1, asList: size === "list" };
  }

  const cols = getLayoutColumns(layout);
  // Individual size "list" is a full-row row inside cols-N grids.
  if (size === "list") return { colSpan: cols, asList: true };

  const rawSpan =
    size === "small" ? 1 : size === "default" ? 2 : /* large */ 4;
  return { colSpan: Math.min(rawSpan, cols), asList: false };
}
