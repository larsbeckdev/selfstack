"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { GroupWithTiles } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { GroupCard } from "./group-card";
import { getGroupTileCols, getGroupWidth, GROUP_COLS } from "@/lib/grid";
import { cn } from "@/lib/utils";

/**
 * Draggable group placed on the category's 2-column snap grid. `group.w` is
 * either 1 (half) or 2 (full). Tile columns shrink for half-width groups so
 * tiles wrap onto new rows.
 */
export function FreeGroup({
  group,
  categoryId,
  catTileCols,
  onAddTile,
  isTileDragging = false,
}: {
  group: GroupWithTiles;
  categoryId: string;
  /** Full-width tile columns the owning category offers. */
  catTileCols: number;
  onAddTile: (groupId: string) => void;
  isTileDragging?: boolean;
}) {
  const isEditing = useEditMode();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: group.id,
      data: { type: "group", categoryId, groupId: group.id, free: true },
      disabled: !isEditing,
    });

  const groupW = getGroupWidth(group.w);
  const tileCols = getGroupTileCols(catTileCols, groupW);
  const x = Math.max(0, Math.min(group.x ?? 0, GROUP_COLS - groupW));
  const y = Math.max(0, group.y ?? 0);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    gridColumn: `${x + 1} / span ${groupW}`,
    gridRow: `${y + 1}`,
    zIndex: isDragging ? 30 : 2,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <GroupCard
        group={group}
        categoryId={categoryId}
        tileCols={tileCols}
        onAddTile={onAddTile}
        isTileDragging={isTileDragging}
        dragHandleProps={
          isEditing ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  );
}

/** Invisible grid of droppable cells behind groups; shown while dragging. */
export function FreeGroupDropGrid({
  categoryId,
  rows,
}: {
  categoryId: string;
  rows: number;
}) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < GROUP_COLS; x++) {
      cells.push(
        <GroupDropCell key={`${x}-${y}`} categoryId={categoryId} x={x} y={y} />,
      );
    }
  }
  return <>{cells}</>;
}

function GroupDropCell({
  categoryId,
  x,
  y,
}: {
  categoryId: string;
  x: number;
  y: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-free-cell:${categoryId}:${x}:${y}`,
    data: { type: "group-free-cell", categoryId, x, y },
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
