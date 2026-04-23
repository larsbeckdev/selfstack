"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GroupWithTiles } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { GroupCard } from "./group-card";

export function SortableGroup({
  group,
  categoryId,
  onAddTile,
}: {
  group: GroupWithTiles;
  categoryId: string;
  onAddTile: (groupId: string) => void;
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
    data: { type: "group", categoryId, groupId: group.id },
    disabled: !isEditing,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <GroupCard
        group={group}
        categoryId={categoryId}
        onAddTile={onAddTile}
        dragHandleProps={
          isEditing ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  );
}
