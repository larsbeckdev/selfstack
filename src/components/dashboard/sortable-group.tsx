"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GroupWithTiles } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { GroupCard } from "./group-card";

export function SortableGroup({
  group,
  categoryId,
  boardColumns,
}: {
  group: GroupWithTiles;
  categoryId: string;
  /** Current number of columns on the board. */
  boardColumns: number;
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
    id: group.id,
    data: { type: "group", parentId: categoryId },
    disabled: !isEditing,
  });

  // Group width in board columns, clamped to current grid.
  const rawW = (group as GroupWithTiles & { w?: number }).w ?? 2;
  const colSpan = Math.max(1, Math.min(rawW, boardColumns));

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${colSpan} / span ${colSpan}`,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <GroupCard
        group={group}
        categoryId={categoryId}
        dragHandleProps={
          isEditing ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  );
}
