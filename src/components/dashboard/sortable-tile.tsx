"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tile } from "@/generated/prisma/client";
import { getTileSpans, getTileSize } from "@/lib/tile-size";
import { useEditMode } from "./edit-mode-context";
import { TileCard } from "./tile-card";

export function SortableTile({
  tile,
  groupId,
  groupCols,
}: {
  tile: Tile;
  groupId: string;
  /** Width of the parent group's sub-grid in columns. */
  groupCols: number;
}) {
  const isEditing = useEditMode();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tile.id,
    data: { type: "tile", parentId: groupId },
    disabled: !isEditing,
  });

  const { colSpan, rowSpan, isList } = getTileSpans(tile, groupCols);
  const size = getTileSize(tile);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${colSpan} / span ${colSpan}`,
    gridRow: isList ? undefined : `span ${rowSpan} / span ${rowSpan}`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-w-0"
      {...(isEditing ? { ...attributes, ...listeners } : {})}>
      <TileCard tile={tile} size={size} />
    </div>
  );
}
