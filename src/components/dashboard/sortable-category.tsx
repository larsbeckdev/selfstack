"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CategoryWithGroups } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { CategoryCard } from "./category-card";
import { getCategoryWidth } from "@/lib/grid";

export function SortableCategory({
  category,
  allGroups,
  onAddGroup,
  onAddTile,
}: {
  category: CategoryWithGroups;
  allGroups: { id: string; name: string; categoryName: string }[];
  onAddGroup: (categoryId: string) => void;
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
    id: category.id,
    data: { type: "category", categoryId: category.id },
    disabled: !isEditing,
  });

  const width = getCategoryWidth(category.w);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    gridColumn: `span ${width}`,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <CategoryCard
        category={category}
        allGroups={allGroups}
        onAddGroup={onAddGroup}
        onAddTile={onAddTile}
        dragHandleProps={
          isEditing ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  );
}
