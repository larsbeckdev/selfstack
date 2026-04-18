"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tile } from "@/generated/prisma/client";
import type { TileViewMode } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { TileCard } from "./tile-card";

export function SortableTile({
  tile,
  groupId,
  viewMode,
}: {
  tile: Tile;
  groupId: string;
  viewMode?: TileViewMode;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditing ? { ...attributes, ...listeners } : {})}>
      <TileCard tile={tile} viewMode={viewMode} />
    </div>
  );
}
