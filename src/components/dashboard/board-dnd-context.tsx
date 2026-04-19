"use client";

import { useId, useState, useCallback, useRef, useEffect } from "react";
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
import { useEditMode } from "@/components/dashboard/edit-mode-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BoardDndContext({ board }: { board: BoardWithContents }) {
  const dndId = useId();
  const { t } = useTranslation();
  const router = useRouter();
  const isEditing = useEditMode();
  const [categories, setCategories] = useState(board.categories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<
    "category" | "group" | "tile" | null
  >(null);

  const dragStartGroupRef = useRef<string | null>(null);
  const preDragCategoriesRef = useRef<typeof categories | null>(null);

  // Track last-saved snapshot for batch sync on edit-mode exit
  const savedCategoriesRef = useRef(board.categories);
  const isDirtyRef = useRef(false);
  const prevIsEditingRef = useRef(isEditing);

  // If server data changes while we have no pending changes, adopt it.
  // While dirty, ignore server snapshot until we sync.
  useEffect(() => {
    if (!isDirtyRef.current) {
      setCategories(board.categories);
      savedCategoriesRef.current = board.categories;
    }
  }, [board.categories]);

  // Batch-save when edit mode turns OFF
  useEffect(() => {
    const wasEditing = prevIsEditingRef.current;
    prevIsEditingRef.current = isEditing;
    if (!wasEditing || isEditing) return;
    if (!isDirtyRef.current) return;

    const current = categories;
    const snapshot = savedCategoriesRef.current;

    (async () => {
      try {
        // Build initial tile -> group map from last saved snapshot
        const initialTileGroup = new Map<string, string>();
        for (const cat of snapshot) {
          for (const g of cat.groups) {
            for (const tile of g.tiles) {
              initialTileGroup.set(tile.id, g.id);
            }
          }
        }

        // Move tiles that changed groups
        for (const cat of current) {
          for (const g of cat.groups) {
            for (const tile of g.tiles) {
              const orig = initialTileGroup.get(tile.id);
              if (orig && orig !== g.id) {
                await moveTileToGroup(tile.id, g.id);
              }
            }
          }
        }

        // Reorder categories
        await reorderCategories(
          board.id,
          current.map((c) => c.id),
        );

        // Reorder groups per category
        for (const cat of current) {
          await reorderGroups(
            cat.id,
            cat.groups.map((g) => g.id),
          );
        }

        // Reorder tiles per group
        for (const cat of current) {
          for (const g of cat.groups) {
            await reorderTiles(
              g.id,
              g.tiles.map((tile) => tile.id),
            );
          }
        }

        isDirtyRef.current = false;
        savedCategoriesRef.current = current;
        router.refresh();
      } catch {
        toast.error(t("error.updateFailed"));
      }
    })();
  }, [isEditing, categories, board.id, router, t]);

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
        // For tiles: if state was updated across groups in handleDragOver,
        // keep the new state instead of reverting.
        if (type === "tile") {
          let currentGroupId: string | null = null;
          for (const cat of categories) {
            for (const g of cat.groups) {
              if (g.tiles.some((tile) => tile.id === active.id)) {
                currentGroupId = g.id;
                break;
              }
            }
            if (currentGroupId) break;
          }
          const original = dragStartGroupRef.current;
          if (
            currentGroupId &&
            original &&
            currentGroupId !== original &&
            preDragCategoriesRef.current
          ) {
            // Cross-group move succeeded — accept it
            isDirtyRef.current = true;
            dragStartGroupRef.current = null;
            preDragCategoriesRef.current = null;
            return;
          }
          // Otherwise revert (true no-op drop)
          if (preDragCategoriesRef.current) {
            setCategories(preDragCategoriesRef.current);
          }
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
          isDirtyRef.current = true;
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
          isDirtyRef.current = true;
        }
      }

      if (type === "tile") {
        const originalGroupId = dragStartGroupRef.current;
        dragStartGroupRef.current = null;
        preDragCategoriesRef.current = null;

        // Find current group from state
        let currentGroupId: string | null = null;
        for (const cat of categories) {
          for (const g of cat.groups) {
            if (g.tiles.some((tile) => tile.id === active.id)) {
              currentGroupId = g.id;
              break;
            }
          }
          if (currentGroupId) break;
        }

        if (!currentGroupId) return;

        if (currentGroupId !== originalGroupId) {
          // Cross-group move — state already updated by onDragOver
          isDirtyRef.current = true;
        } else {
          // Same-group reorder
          const parentId = active.data.current?.parentId as string;
          for (const cat of categories) {
            const group = cat.groups.find((g) => g.id === parentId);
            if (!group) continue;
            const oldIndex = group.tiles.findIndex(
              (tile) => tile.id === active.id,
            );
            const newIndex = group.tiles.findIndex(
              (tile) => tile.id === over.id,
            );
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
              isDirtyRef.current = true;
            }
            break;
          }
        }
      }
    },
    [categories],
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
