"use client";

import { useId, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { BoardWithContents, CategoryWithGroups } from "@/types";
import {
  reorderCategories,
  reorderGroups,
  reorderTiles,
} from "@/lib/actions/board";
import { SortableCategory } from "@/components/dashboard/sortable-category";
import { CategoryCard } from "@/components/dashboard/category-card";

export function BoardDndContext({ board }: { board: BoardWithContents }) {
  const dndId = useId();
  const [categories, setCategories] = useState(board.categories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<
    "category" | "group" | "tile" | null
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const type = active.data.current?.type as
      | "category"
      | "group"
      | "tile"
      | undefined;
    setActiveId(active.id as string);
    setActiveType(type ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveType(null);

      if (!over || active.id === over.id) return;

      const type = active.data.current?.type;

      if (type === "category") {
        const oldIndex = categories.findIndex((c) => c.id === active.id);
        const newIndex = categories.findIndex((c) => c.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(categories, oldIndex, newIndex);
          setCategories(newOrder);
          await reorderCategories(
            board.id,
            newOrder.map((c) => c.id),
          );
        }
      }

      if (type === "group") {
        const parentId = active.data.current?.parentId as string;
        const cat = categories.find((c) => c.id === parentId);
        if (!cat) return;
        const oldIndex = cat.groups.findIndex((g) => g.id === active.id);
        const newIndex = cat.groups.findIndex((g) => g.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newGroups = arrayMove(cat.groups, oldIndex, newIndex);
          setCategories(
            categories.map((c) =>
              c.id === parentId ? { ...c, groups: newGroups } : c,
            ),
          );
          await reorderGroups(
            parentId,
            newGroups.map((g) => g.id),
          );
        }
      }

      if (type === "tile") {
        const parentId = active.data.current?.parentId as string;
        for (const cat of categories) {
          const group = cat.groups.find((g) => g.id === parentId);
          if (!group) continue;
          const oldIndex = group.tiles.findIndex((t) => t.id === active.id);
          const newIndex = group.tiles.findIndex((t) => t.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            const newTiles = arrayMove(group.tiles, oldIndex, newIndex);
            setCategories(
              categories.map((c) => ({
                ...c,
                groups: c.groups.map((g) =>
                  g.id === parentId ? { ...g, tiles: newTiles } : g,
                ),
              })),
            );
            await reorderTiles(
              parentId,
              newTiles.map((t) => t.id),
            );
          }
          break;
        }
      }
    },
    [categories, board.id],
  );

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}>
      <SortableContext
        items={categories.map((c) => c.id)}
        strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {categories.map((category) => (
            <SortableCategory key={category.id} category={category} />
          ))}
          {categories.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                Dieses Board ist noch leer. Füge eine Kategorie hinzu, um zu
                starten.
              </p>
            </div>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId && activeType === "category" && (
          <CategoryCard
            category={
              categories.find((c) => c.id === activeId) as CategoryWithGroups
            }
            isDragOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
