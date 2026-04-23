"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CategoryWithGroups } from "@/types";
import { useEditMode } from "./edit-mode-context";
import { CategoryCard } from "./category-card";
import { getCategoryWidth, CATEGORY_COLS } from "@/lib/grid";
import { cn } from "@/lib/utils";

export function FreeCategory({
  category,
  onAddGroup,
  onAddTile,
  isGroupDragging = false,
  isTileDragging = false,
}: {
  category: CategoryWithGroups;
  onAddGroup: (categoryId: string) => void;
  onAddTile: (groupId: string) => void;
  isGroupDragging?: boolean;
  isTileDragging?: boolean;
}) {
  const isEditing = useEditMode();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: category.id,
      data: { type: "category", categoryId: category.id, free: true },
      disabled: !isEditing,
    });

  const width = getCategoryWidth(category.w);
  const x = Math.max(0, Math.min(category.x ?? 0, CATEGORY_COLS - width));
  const y = Math.max(0, category.y ?? 0);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    gridColumn: `${x + 1} / span ${width}`,
    gridRow: `${y + 1}`,
    zIndex: isDragging ? 30 : 2,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <CategoryCard
        category={category}
        onAddGroup={onAddGroup}
        onAddTile={onAddTile}
        isGroupDragging={isGroupDragging}
        isTileDragging={isTileDragging}
        dragHandleProps={
          isEditing ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
  );
}

/** Invisible grid of droppable cells behind categories; shown while dragging. */
export function FreeDropGrid({ rows }: { rows: number }) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < CATEGORY_COLS; x++) {
      cells.push(<DropCell key={`${x}-${y}`} x={x} y={y} />);
    }
  }
  return <>{cells}</>;
}

function DropCell({ x, y }: { x: number; y: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `free-cell:${x}:${y}`,
    data: { type: "free-cell", x, y },
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
        "pointer-events-auto rounded-lg border border-dashed transition-colors",
        isOver
          ? "border-primary/60 bg-primary/10"
          : "border-border/30 bg-muted/20",
      )}
    />
  );
}
