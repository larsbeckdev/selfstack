"use client";

import { useId, useState, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
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
  moveTileToGroup,
} from "@/lib/actions/board";
import { SortableCategory } from "@/components/dashboard/sortable-category";
import { CategoryCard } from "@/components/dashboard/category-card";
import { TileCard } from "@/components/dashboard/tile-card";
import { useTranslation } from "@/components/locale-provider";
import { useRouter } from "next/navigation";

export function BoardDndContext({ board }: { board: BoardWithContents }) {
  const dndId = useId();
  const { t } = useTranslation();
  const router = useRouter();
  const [categories, setCategories] = useState(board.categories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<
    "category" | "group" | "tile" | null
  >(null);

  const dragStartGroupRef = useRef<string | null>(null);
  const preDragCategoriesRef = useRef<typeof categories | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const type = active.data.current?.type as
        | "category"
        | "group"
        | "tile"
        | undefined;
      setActiveId(active.id as string);
      setActiveType(type ?? null);
      if (type === "tile") {
        dragStartGroupRef.current = active.data.current?.parentId as string;
        preDragCategoriesRef.current = categories;
      }
    },
    [categories],
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeType = active.data.current?.type;
    if (activeType !== "tile") return;

    const overData = over.data.current;
    let overGroupId: string | null = null;

    if (overData?.type === "tile") {
      overGroupId = overData.parentId as string;
    } else if (overData?.type === "group-droppable") {
      overGroupId = overData.groupId as string;
    }

    if (!overGroupId) return;

    setCategories((prev) => {
      let activeGroupId: string | null = null;
      let activeTileIdx = -1;

      for (const cat of prev) {
        for (const group of cat.groups) {
          const idx = group.tiles.findIndex((t) => t.id === active.id);
          if (idx !== -1) {
            activeGroupId = group.id;
            activeTileIdx = idx;
            break;
          }
        }
        if (activeGroupId) break;
      }

      if (
        !activeGroupId ||
        activeTileIdx === -1 ||
        activeGroupId === overGroupId
      ) {
        return prev;
      }

      let activeTile: (typeof prev)[0]["groups"][0]["tiles"][0] | undefined;

      return prev.map((cat) => ({
        ...cat,
        groups: cat.groups.map((g) => {
          if (g.id === activeGroupId) {
            activeTile = g.tiles[activeTileIdx];
            return { ...g, tiles: g.tiles.filter((t) => t.id !== active.id) };
          }
          if (g.id === overGroupId && activeTile) {
            const newTiles = [...g.tiles];
            if (overData?.type === "tile") {
              const overIndex = newTiles.findIndex((t) => t.id === over.id);
              newTiles.splice(
                overIndex >= 0 ? overIndex : newTiles.length,
                0,
                activeTile,
              );
            } else {
              newTiles.push(activeTile);
            }
            return { ...g, tiles: newTiles };
          }
          return g;
        }),
      }));
    });
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      const type = active.data.current?.type;

      setActiveId(null);
      setActiveType(null);

      if (!over || active.id === over.id) {
        // Revert cross-group moves on cancel
        if (type === "tile" && preDragCategoriesRef.current) {
          setCategories(preDragCategoriesRef.current);
        }
        dragStartGroupRef.current = null;
        preDragCategoriesRef.current = null;
        return;
      }

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
          router.refresh();
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
          router.refresh();
        }
      }

      if (type === "tile") {
        const originalGroupId = dragStartGroupRef.current;
        dragStartGroupRef.current = null;
        preDragCategoriesRef.current = null;

        // Find current group from state
        let currentGroupId: string | null = null;
        let currentTiles: string[] = [];
        for (const cat of categories) {
          for (const g of cat.groups) {
            if (g.tiles.some((t) => t.id === active.id)) {
              currentGroupId = g.id;
              currentTiles = g.tiles.map((t) => t.id);
              break;
            }
          }
          if (currentGroupId) break;
        }

        if (!currentGroupId) return;

        if (currentGroupId !== originalGroupId) {
          // Cross-group move — state already updated by onDragOver
          await moveTileToGroup(active.id as string, currentGroupId);
          await reorderTiles(currentGroupId, currentTiles);
        } else {
          // Same-group reorder
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
      }
    },
    [categories, board.id],
  );

  const activeTile =
    activeId && activeType === "tile"
      ? categories
          .flatMap((c) => c.groups)
          .flatMap((g) => g.tiles)
          .find((t) => t.id === activeId)
      : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
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
              <p className="text-muted-foreground">{t("board.empty")}</p>
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
        {activeTile && <TileCard tile={activeTile} />}
      </DragOverlay>
    </DndContext>
  );
}
