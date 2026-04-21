"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GroupWithTiles } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { GroupCard } from "./group-card";

export function SortableGroup({
  group,
  categoryId,
}: {
  group: GroupWithTiles;
  categoryId: string;
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

  // Hybrid layout: groups always span the full category width and stack
  // vertically. Horizontal freedom lives inside the group's layout template.
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
