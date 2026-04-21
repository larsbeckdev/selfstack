import type { Tile } from "@/generated/prisma/client";

/** Tile size options. Each maps to a fixed grid footprint. */
export type TileSize = "small" | "default" | "large";

/** Tile spans in grid units (1u). small=1×1, default=2×2, large=4×4. */
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

export function getTileBox(tile: Pick<Tile, "size" | "x" | "y">): GridBox {
  const { w, h } = TILE_SPANS[getTileSize(tile)];
  return { x: tile.x, y: tile.y, w, h };
}

/** A positioned rectangle on a grid canvas, in grid units. */
export type GridBox = { x: number; y: number; w: number; h: number };

/** How many grid rows the category card's header occupies (incl. ~40px header). */
export const CATEGORY_HEADER_ROWS = 1;
/** How many grid rows the group card's header occupies (~32px). */
export const GROUP_HEADER_ROWS = 1;

export type GroupLayoutMode = "grid" | "list";

export function getGroupLayout(group: {
  layout?: string | null;
}): GroupLayoutMode {
  return group.layout === "list" ? "list" : "grid";
}

/** True when two boxes overlap on the grid. */
export function boxesOverlap(a: GridBox, b: GridBox): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/**
 * Compact a list of boxes onto a grid of `cols` columns.
 * - Clamps x so that x + w ≤ cols (scaling down w if w > cols).
 * - Resolves collisions by pushing later items downward.
 * Input order is preserved for priority. Returns a new array with
 * resolved positions (same ids/refs).
 */
export function compactLayout<T extends { id: string } & GridBox>(
  items: T[],
  cols: number,
): T[] {
  const placed: T[] = [];
  for (const raw of items) {
    const w = Math.max(1, Math.min(raw.w, cols));
    const x = Math.max(0, Math.min(raw.x, cols - w));
    let y = Math.max(0, raw.y);
    // Push down until no collision
    while (placed.some((p) => boxesOverlap({ x, y, w, h: raw.h }, p))) {
      y++;
    }
    placed.push({ ...raw, x, y, w });
  }
  return placed;
}

/** Inline style for an item positioned at (x,y) with (w,h) spans. */
export function gridItemStyle(box: GridBox): React.CSSProperties {
  return {
    gridColumn: `${box.x + 1} / span ${box.w}`,
    gridRow: `${box.y + 1} / span ${box.h}`,
  };
}

/** Total rows used by a layout — useful for sizing the canvas if needed. */
export function layoutRows(items: GridBox[]): number {
  return items.reduce((max, it) => Math.max(max, it.y + it.h), 0);
}

/**
 * Compact with an optional priority id: the priority item is placed first
 * (so other items get pushed to accommodate it). Preserves id-to-box stability.
 */
export function compactWithPriority<T extends { id: string } & GridBox>(
  items: T[],
  cols: number,
  priorityId?: string,
): T[] {
  if (!priorityId) return compactLayout(items, cols);
  const idx = items.findIndex((i) => i.id === priorityId);
  if (idx < 0) return compactLayout(items, cols);
  const reordered = [
    items[idx],
    ...items.slice(0, idx),
    ...items.slice(idx + 1),
  ];
  const compacted = compactLayout(reordered, cols);
  // Restore original order in the returned array for stable React keys.
  const byId = new Map(compacted.map((i) => [i.id, i]));
  return items.map((orig) => byId.get(orig.id) ?? orig);
}
