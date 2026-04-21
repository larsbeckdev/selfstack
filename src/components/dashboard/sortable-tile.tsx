"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tile } from "@/generated/prisma/client";
import { getTileSize, type TileSize } from "@/lib/tile-size";
import { getTilePlacement, type GroupLayout } from "@/lib/group-layout";
import { useEditMode } from "./edit-mode-context";
import { TileCard } from "./tile-card";

export function SortableTile({
  tile,
  groupId,
  layout,
}: {
  tile: Tile;
  groupId: string;
  /** Layout template of the parent group. */
  layout: GroupLayout;
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

  const { colSpan, asList } = getTilePlacement(tile, layout);
  const baseSize: TileSize = getTileSize(tile);
  // In the "list" layout we force every tile to render in its list form.
  const renderSize: TileSize = asList && layout === "list" ? "list" : baseSize;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  // Only apply a grid-column span in grids — skip for pure list layouts.
  if (layout !== "list") {
    style.gridColumn = `span ${colSpan} / span ${colSpan}`;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-w-0"
      {...(isEditing ? { ...attributes, ...listeners } : {})}>
      <TileCard tile={tile} size={renderSize} />
    </div>
  );
}
