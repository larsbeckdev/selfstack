"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Tile } from "@/generated/prisma/client";
import { useEditMode } from "./edit-mode-context";
import { TileCard } from "./tile-card";
import { TILE_SPANS, getTileSize, INNER_ROW_PX } from "@/lib/grid";
import { cn } from "@/lib/utils";

/** Draggable tile placed at fixed (x, y) grid coordinates within a group. */
export function FreeTile({
  tile,
  groupId,
  categoryId,
  cols,
}: {
  tile: Tile;
  groupId: string;
  categoryId: string;
  cols: number;
}) {
  const isEditing = useEditMode();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: tile.id,
      data: { type: "tile", groupId, categoryId, free: true },
      disabled: !isEditing,
    });

  const size = getTileSize(tile);
  const { w, h } = TILE_SPANS[size];
  const x = Math.max(0, Math.min(tile.x ?? 0, cols - w));
  const y = Math.max(0, tile.y ?? 0);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    gridColumn: `${x + 1} / span ${w}`,
    gridRow: `${y + 1} / span ${h}`,
    minHeight: `${h * INNER_ROW_PX}px`,
    zIndex: isDragging ? 30 : 2,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-tile-size={size}
      className={cn("min-w-0", isEditing && "touch-none")}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}>
      <TileCard tile={tile} layout="snap" />
    </div>
  );
}

/** Invisible grid of droppable cells behind tiles; shown while dragging in snap mode. */
export function FreeTileGrid({
  groupId,
  cols,
  rows,
}: {
  groupId: string;
  cols: number;
  rows: number;
}) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push(
        <TileDropCell key={`${x}-${y}`} groupId={groupId} x={x} y={y} />,
      );
    }
  }
  return <>{cells}</>;
}

function TileDropCell({
  groupId,
  x,
  y,
}: {
  groupId: string;
  x: number;
  y: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tile-free-cell:${groupId}:${x}:${y}`,
    data: { type: "tile-free-cell", groupId, x, y },
  });
  return (
    <div
      ref={setNodeRef}
      data-drop-cell
      style={{
        gridColumn: `${x + 1}`,
        gridRow: `${y + 1}`,
        zIndex: 1,
      }}
      className={cn(
        "pointer-events-auto rounded-md border border-dashed transition-colors",
        isOver
          ? "border-primary/60 bg-primary/10"
          : "border-border/30 bg-muted/20",
      )}
    />
  );
}
