"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Tile } from "@/generated/prisma/client";
import { useEditMode } from "./edit-mode-context";
import { TileCard } from "./tile-card";
import {
  TILE_SPANS,
  getTileSize,
  type GroupLayoutMode,
  INNER_ROW_PX,
} from "@/lib/grid";
import { cn } from "@/lib/utils";

export function SortableTile({
  tile,
  groupId,
  categoryId,
  layout,
  otherGroups,
}: {
  tile: Tile;
  groupId: string;
  categoryId: string;
  layout: GroupLayoutMode;
  otherGroups: { id: string; name: string; categoryName: string }[];
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
    data: { type: "tile", groupId, categoryId },
    disabled: !isEditing,
  });

  const size = getTileSize(tile);
  const { w, h } = TILE_SPANS[size];

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (layout === "grid") {
    style.gridColumn = `span ${w}`;
    style.gridRow = `span ${h}`;
    style.minHeight = `${h * INNER_ROW_PX}px`;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("min-w-0", isEditing && "touch-none")}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}>
      <TileCard tile={tile} layout={layout} otherGroups={otherGroups} />
    </div>
  );
}
