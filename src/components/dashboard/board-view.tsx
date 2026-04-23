"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  Pencil,
  Plus,
  Settings2,
  Check,
  FolderPlus,
  LayoutGrid,
  Square,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SafePointerSensor } from "@/lib/dnd-safe-sensor";
import type {
  BoardRole,
  BoardWithContents,
  CategoryWithGroups,
  GroupWithTiles,
} from "@/types";
import type { Tile } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DynamicIcon } from "@/components/dynamic-icon";
import { CategoryCard } from "./category-card";
import { GroupCard } from "./group-card";
import { TileCard } from "./tile-card";
import { FreeCategory, FreeDropGrid } from "./free-category";
import { EditModeProvider } from "./edit-mode-context";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddGroupDialog } from "./add-group-dialog";
import { AddTileDialog } from "./add-tile-dialog";
import { BoardSettingsDialog } from "./board-settings-dialog";
import { useTranslation } from "@/components/locale-provider";
import { usePublishBoardTitle } from "@/components/layout/board-title-provider";
import {
  reorderTiles,
  moveTileToGroup,
  setCategoryPosition,
  setGroupPosition,
  setTilePosition,
} from "@/lib/actions/board";
import {
  getCategoryWidth,
  getCategoryInnerCols,
  getGroupLayout,
  getGroupTileCols,
  getGroupWidth,
  getTileSize,
  CATEGORY_COLS,
  TILE_SPANS,
} from "@/lib/grid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ActiveType = "category" | "group" | "tile" | null;

export function BoardView({
  board,
  boardRole = "viewer",
  forceReadonly = false,
}: {
  board: BoardWithContents;
  boardRole?: BoardRole;
  forceReadonly?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const dndId = useId();

  const canEdit =
    !forceReadonly && (boardRole === "owner" || boardRole === "editor");
  const isOwner = !forceReadonly && boardRole === "owner";

  // Publish the board title into the shell (sidebar / public header) when
  // rendering in read-only mode so visitors see which board they're viewing
  // even though the in-board header is hidden.
  usePublishBoardTitle(board.name, forceReadonly);

  const [isEditing, setIsEditing] = useState(false);

  // Board categories are always snap-grid positioned (free mode).
  const [categories, setCategories] = useState<CategoryWithGroups[]>(
    board.categories,
  );
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!dirtyRef.current) setCategories(board.categories);
  }, [board.categories]);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addTileOpen, setAddTileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (isOwner && searchParams?.get("settings") === "true") {
      setSettingsOpen(true);
      // strip the query so the dialog doesn't re-open on back navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("settings");
      window.history.replaceState(null, "", url.toString());
    }
  }, [isOwner, searchParams]);
  const [targetCategoryId, setTargetCategoryId] = useState<string | undefined>(
    undefined,
  );
  const [targetGroupId, setTargetGroupId] = useState<string | undefined>(
    undefined,
  );

  const allGroups = useMemo(
    () =>
      categories.flatMap((c) =>
        c.groups.map((g) => ({
          id: g.id,
          name: g.name,
          categoryName: c.name,
        })),
      ),
    [categories],
  );

  // ── DnD state ─────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<ActiveType>(null);

  const sensors = useSensors(
    useSensor(SafePointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // For tiles & (always-free) categories: prefer pointerWithin;
  // for auto-mode groups: closestCenter works better.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (activeType === "tile" || activeType === "category") {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) return pointerCollisions;
        return rectIntersection(args);
      }
      return closestCenter(args);
    },
    [activeType],
  );

  // ── Handlers ──────────────────────────────────────────────────────────

  const findTileLocation = useCallback(
    (
      cats: CategoryWithGroups[],
      tileId: string,
    ): { catIdx: number; grpIdx: number; tileIdx: number } | null => {
      for (let ci = 0; ci < cats.length; ci++) {
        for (let gi = 0; gi < cats[ci].groups.length; gi++) {
          const tIdx = cats[ci].groups[gi].tiles.findIndex(
            (x) => x.id === tileId,
          );
          if (tIdx >= 0) return { catIdx: ci, grpIdx: gi, tileIdx: tIdx };
        }
      }
      return null;
    },
    [],
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const type = (e.active.data.current as { type?: ActiveType } | undefined)
      ?.type;
    setActiveId(e.active.id as string);
    setActiveType(type ?? null);
  }, []);

  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      const { active, over } = e;
      if (!over) return;
      const aData = active.data.current as
        | { type?: string; groupId?: string }
        | undefined;
      if (aData?.type !== "tile") return;

      const oData = over.data.current as
        | { type?: string; groupId?: string }
        | undefined;
      let overGroupId: string | null = null;
      if (oData?.type === "tile") overGroupId = oData.groupId ?? null;
      else if (oData?.type === "group-drop")
        overGroupId = oData.groupId ?? null;
      if (!overGroupId) return;

      setCategories((prev) => {
        const loc = findTileLocation(prev, active.id as string);
        if (!loc) return prev;
        const srcGroupId = prev[loc.catIdx].groups[loc.grpIdx].id;
        if (srcGroupId === overGroupId) return prev;

        // Move tile to target group (position determined by over: tile index or end).
        const tile = prev[loc.catIdx].groups[loc.grpIdx].tiles[loc.tileIdx];
        const next = prev.map((c) => ({
          ...c,
          groups: c.groups.map((g) => ({ ...g, tiles: [...g.tiles] })),
        }));
        // remove from source
        next[loc.catIdx].groups[loc.grpIdx].tiles.splice(loc.tileIdx, 1);

        // insert into target
        for (let ci = 0; ci < next.length; ci++) {
          const gi = next[ci].groups.findIndex((g) => g.id === overGroupId);
          if (gi < 0) continue;
          const tiles = next[ci].groups[gi].tiles;
          let insertIdx = tiles.length;
          if (oData?.type === "tile") {
            const overIdx = tiles.findIndex((x) => x.id === over.id);
            insertIdx = overIdx >= 0 ? overIdx : tiles.length;
          }
          tiles.splice(insertIdx, 0, {
            ...tile,
            groupId: overGroupId,
          } as Tile);
          break;
        }
        dirtyRef.current = true;
        return next;
      });
    },
    [findTileLocation],
  );

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      const { active, over } = e;
      const aData = active.data.current as
        | {
            type?: ActiveType;
            categoryId?: string;
            groupId?: string;
            free?: boolean;
          }
        | undefined;
      const type = aData?.type ?? null;
      setActiveId(null);
      setActiveType(null);

      if (!over) return;

      // ── Category reposition (snap to cell, with overlap prevention)
      if (type === "category") {
        const oData = over.data.current as
          | { type?: string; x?: number; y?: number }
          | undefined;
        if (oData?.type !== "free-cell") return;
        const cat = categories.find((c) => c.id === active.id);
        if (!cat) return;
        const w = getCategoryWidth(cat.w);
        const newX = Math.max(0, Math.min(oData.x ?? 0, CATEGORY_COLS - w));
        const targetY = Math.max(0, oData.y ?? 0);

        // Shift down until row has no horizontal overlap with other categories.
        const overlapsAt = (y: number) =>
          categories.some((c) => {
            if (c.id === cat.id) return false;
            if ((c.y ?? 0) !== y) return false;
            const cx = c.x ?? 0;
            const cw = getCategoryWidth(c.w);
            return !(newX + w <= cx || cx + cw <= newX);
          });
        let newY = targetY;
        while (overlapsAt(newY)) newY++;

        if (cat.x === newX && cat.y === newY) return;
        setCategories((prev) =>
          prev.map((c) => (c.id === cat.id ? { ...c, x: newX, y: newY } : c)),
        );
        dirtyRef.current = true;
        try {
          await setCategoryPosition(cat.id, newX, newY);
          dirtyRef.current = false;
          router.refresh();
        } catch {
          toast.error(t("error.updateFailed"));
          setCategories(board.categories);
          dirtyRef.current = false;
        }
        return;
      }

      // ── Group reposition (snap to cell, with overlap prevention; cross-category allowed)
      if (type === "group") {
        const activeCatId = aData?.categoryId ?? null;
        if (!activeCatId) return;
        const oData = over.data.current as
          | { type?: string; categoryId?: string; x?: number; y?: number }
          | undefined;
        if (oData?.type !== "group-free-cell") return;
        const targetCatId = oData.categoryId ?? activeCatId;
        const sourceCat = categories.find((c) => c.id === activeCatId);
        const targetCat = categories.find((c) => c.id === targetCatId);
        if (!sourceCat || !targetCat) return;
        const group = sourceCat.groups.find((g) => g.id === active.id);
        if (!group) return;
        const groupW = getGroupWidth(group.w);
        const newX = Math.max(0, Math.min(oData.x ?? 0, 2 - groupW));
        const targetY = Math.max(0, oData.y ?? 0);

        const overlapsAt = (y: number) =>
          targetCat.groups.some((g) => {
            if (g.id === group.id) return false;
            if ((g.y ?? 0) !== y) return false;
            const gx = g.x ?? 0;
            const gw = getGroupWidth(g.w);
            return !(newX + groupW <= gx || gx + gw <= newX);
          });
        let newY = targetY;
        while (overlapsAt(newY)) newY++;

        const sameCat = activeCatId === targetCatId;
        if (sameCat && group.x === newX && group.y === newY) return;
        setCategories((prev) => {
          const withoutGroup = prev.map((c) =>
            c.id === activeCatId
              ? { ...c, groups: c.groups.filter((g) => g.id !== group.id) }
              : c,
          );
          const movedGroup = { ...group, x: newX, y: newY };
          return withoutGroup.map((c) =>
            c.id === targetCatId
              ? { ...c, groups: [...c.groups, movedGroup] }
              : c,
          );
        });
        dirtyRef.current = true;
        try {
          await setGroupPosition(
            group.id,
            newX,
            newY,
            sameCat ? undefined : targetCatId,
          );
          dirtyRef.current = false;
          router.refresh();
        } catch {
          toast.error(t("error.updateFailed"));
          setCategories(board.categories);
          dirtyRef.current = false;
        }
        return;
      }

      // ── Tile reorder / cross-group move
      if (type === "tile") {
        const loc = findTileLocation(categories, active.id as string);
        if (!loc) return;
        const currentGroup = categories[loc.catIdx].groups[loc.grpIdx];
        const originalGroupId = findOriginalGroupId(
          board.categories,
          active.id as string,
        );

        const oData = over.data.current as
          | { type?: string; groupId?: string; x?: number; y?: number }
          | undefined;

        // Snap-mode: dropped on a tile-free-cell → update tile position
        if (
          oData?.type === "tile-free-cell" &&
          aData?.free &&
          oData.groupId === currentGroup.id
        ) {
          const tile = currentGroup.tiles.find((x) => x.id === active.id);
          if (!tile) return;
          const size = getTileSize(tile);
          const { w, h } = TILE_SPANS[size];
          const catTileCols = getCategoryInnerCols(
            getCategoryWidth(categories[loc.catIdx].w),
          );
          const tileCols = getGroupTileCols(
            catTileCols,
            getGroupWidth(currentGroup.w),
          );
          const newX = Math.max(0, Math.min(oData.x ?? 0, tileCols - w));
          const targetY = Math.max(0, oData.y ?? 0);

          // Shift down until rectangle is free of overlaps with other tiles.
          const overlapsAt = (y: number) =>
            currentGroup.tiles.some((other) => {
              if (other.id === tile.id) return false;
              const oSize = getTileSize(other);
              const oSpan = TILE_SPANS[oSize];
              const ox = other.x ?? 0;
              const oy = other.y ?? 0;
              const horizOverlap = !(newX + w <= ox || ox + oSpan.w <= newX);
              const vertOverlap = !(y + h <= oy || oy + oSpan.h <= y);
              return horizOverlap && vertOverlap;
            });
          let newY = targetY;
          while (overlapsAt(newY)) newY++;

          const crossGroup =
            originalGroupId && originalGroupId !== currentGroup.id;
          if (!crossGroup && tile.x === newX && tile.y === newY) return;
          setCategories((prev) =>
            prev.map((c, ci) =>
              ci === loc.catIdx
                ? {
                    ...c,
                    groups: c.groups.map((g, gi) =>
                      gi === loc.grpIdx
                        ? {
                            ...g,
                            tiles: g.tiles.map((x) =>
                              x.id === tile.id ? { ...x, x: newX, y: newY } : x,
                            ),
                          }
                        : g,
                    ),
                  }
                : c,
            ),
          );
          dirtyRef.current = true;
          try {
            if (crossGroup) {
              await moveTileToGroup(tile.id, currentGroup.id);
            }
            await setTilePosition(tile.id, newX, newY);
            dirtyRef.current = false;
            router.refresh();
          } catch {
            toast.error(t("error.updateFailed"));
            setCategories(board.categories);
            dirtyRef.current = false;
          }
          return;
        }

        // Same group: reorder within current group based on over-tile position
        if (oData?.type === "tile" && active.id !== over.id) {
          const sameGroup = oData.groupId === currentGroup.id;
          if (sameGroup) {
            const oldIdx = loc.tileIdx;
            const newIdx = currentGroup.tiles.findIndex(
              (x) => x.id === over.id,
            );
            if (newIdx >= 0 && newIdx !== oldIdx) {
              const nextTiles = arrayMove(currentGroup.tiles, oldIdx, newIdx);
              const next = categories.map((c, ci) =>
                ci === loc.catIdx
                  ? {
                      ...c,
                      groups: c.groups.map((g, gi) =>
                        gi === loc.grpIdx ? { ...g, tiles: nextTiles } : g,
                      ),
                    }
                  : c,
              );
              setCategories(next);
              dirtyRef.current = true;
              try {
                await reorderTiles(
                  currentGroup.id,
                  nextTiles.map((x) => x.id),
                );
                dirtyRef.current = false;
                router.refresh();
              } catch {
                toast.error(t("error.updateFailed"));
              }
              return;
            }
          }
        }

        // Cross-group move (handleDragOver already moved state; persist).
        if (originalGroupId && originalGroupId !== currentGroup.id) {
          try {
            await moveTileToGroup(active.id as string, currentGroup.id);
            await reorderTiles(
              currentGroup.id,
              currentGroup.tiles.map((x) => x.id),
            );
            dirtyRef.current = false;
            router.refresh();
          } catch {
            toast.error(t("error.updateFailed"));
            // Revert by re-adopting server state
            setCategories(board.categories);
            dirtyRef.current = false;
          }
          return;
        }
      }
    },
    [board.id, board.categories, categories, findTileLocation, router, t],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setActiveType(null);
    if (dirtyRef.current) {
      setCategories(board.categories);
      dirtyRef.current = false;
    }
  }, [board.categories]);

  const handleAddGroup = (categoryId: string) => {
    setTargetCategoryId(categoryId);
    setAddGroupOpen(true);
  };
  const handleAddTile = (groupId: string) => {
    setTargetGroupId(groupId);
    setAddTileOpen(true);
  };

  // ── Drag overlay ──────────────────────────────────────────────────────
  const overlay = useMemo(() => {
    if (!activeId) return null;
    if (activeType === "category") {
      const cat = categories.find((c) => c.id === activeId);
      if (!cat) return null;
      return (
        <div style={{ width: 320, opacity: 0.95 }}>
          <CategoryCard
            category={cat}
            onAddGroup={() => {}}
            onAddTile={() => {}}
          />
        </div>
      );
    }
    if (activeType === "group") {
      let group: GroupWithTiles | null = null;
      let catId = "";
      let catCols = 12;
      for (const c of categories) {
        const g = c.groups.find((x) => x.id === activeId);
        if (g) {
          group = g;
          catId = c.id;
          catCols = getCategoryInnerCols(getCategoryWidth(c.w));
          break;
        }
      }
      if (!group) return null;
      const overlayTileCols = getGroupTileCols(catCols, getGroupWidth(group.w));
      return (
        <div style={{ width: 280, opacity: 0.95 }}>
          <GroupCard
            group={group}
            categoryId={catId}
            tileCols={overlayTileCols}
            onAddTile={() => {}}
          />
        </div>
      );
    }
    if (activeType === "tile") {
      for (const c of categories) {
        for (const g of c.groups) {
          const tile = g.tiles.find((x) => x.id === activeId);
          if (tile) {
            return (
              <div style={{ width: 140, opacity: 0.95 }}>
                <TileCard tile={tile} layout={getGroupLayout(g)} />
              </div>
            );
          }
        }
      }
    }
    return null;
  }, [activeId, activeType, categories]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <EditModeProvider isEditing={canEdit && isEditing}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}>
        <div className="space-y-4">
          {/* board header (hidden for readonly/public views) */}
          {!forceReadonly && (
            <div className="sticky top-14 z-20 flex flex-wrap items-center gap-3 border-b border-border/50 bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DynamicIcon
                  name={board.icon}
                  iconUrl={board.iconUrl}
                  className="size-5"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold tracking-tight">
                  {board.name}
                </h1>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setIsEditing(false)}
                          variant="default">
                          <Check className="size-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {t("common.done")}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="sm:hidden">
                        {t("common.done")}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditing(true)}>
                          <Pencil className="size-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {t("board.editMode")}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="sm:hidden">
                        {t("board.editMode")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isEditing && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="size-4 sm:mr-2" />
                          <span className="hidden sm:inline">
                            {t("common.add")}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setAddCategoryOpen(true)}>
                          <FolderPlus className="mr-2 size-4" />
                          {t("category.addTo")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={categories.length === 0}
                          onClick={() => {
                            setTargetCategoryId(undefined);
                            setAddGroupOpen(true);
                          }}>
                          <LayoutGrid className="mr-2 size-4" />
                          {t("group.addTo")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={allGroups.length === 0}
                          onClick={() => {
                            setTargetGroupId(undefined);
                            setAddTileOpen(true);
                          }}>
                          <Square className="mr-2 size-4" />
                          {t("tile.addTo")}
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Sparkles className="mr-2 size-4" />
                          {t("widget.addTo")}
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({t("common.comingSoon")})
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {isOwner && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSettingsOpen(true)}
                      title={t("board.settings")}>
                      <Settings2 className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* dashboard surface */}
          {categories.length === 0 ? (
            <div className="rounded-lg border bg-card p-12 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                {t("board.noCategoriesTitle")}
              </p>
              {canEdit && (
                <Button onClick={() => setAddCategoryOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  {t("category.addTo")}
                </Button>
              )}
            </div>
          ) : (
            <div
              data-board-grid
              className={cn(
                "grid gap-4 rounded-xl",
                isEditing && "p-3 bg-edit-grid",
              )}
              style={{
                gridTemplateColumns: `repeat(${CATEGORY_COLS}, minmax(0, 1fr))`,
                gridAutoRows: "minmax(140px, auto)",
              }}>
              {isEditing && activeType === "category" && (
                <FreeDropGrid
                  rows={
                    Math.max(...categories.map((c) => (c.y ?? 0) + 1), 0) + 3
                  }
                />
              )}
              {categories.map((cat) => (
                <FreeCategory
                  key={cat.id}
                  category={cat}
                  onAddGroup={handleAddGroup}
                  onAddTile={handleAddTile}
                  isGroupDragging={activeType === "group"}
                  isTileDragging={activeType === "tile"}
                />
              ))}
            </div>
          )}

          {canEdit && (
            <>
              <AddCategoryDialog
                boardId={board.id}
                open={addCategoryOpen}
                onOpenChange={setAddCategoryOpen}
              />
              <AddGroupDialog
                categories={board.categories}
                defaultCategoryId={targetCategoryId}
                open={addGroupOpen}
                onOpenChange={setAddGroupOpen}
              />
              <AddTileDialog
                categories={board.categories}
                defaultGroupId={targetGroupId}
                open={addTileOpen}
                onOpenChange={setAddTileOpen}
              />
            </>
          )}
          {isOwner && (
            <BoardSettingsDialog
              board={board}
              boardRole={boardRole}
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
            />
          )}
        </div>

        <DragOverlay>{overlay}</DragOverlay>
      </DndContext>
    </EditModeProvider>
  );
}

function findOriginalGroupId(
  categories: CategoryWithGroups[],
  tileId: string,
): string | null {
  for (const c of categories) {
    for (const g of c.groups) {
      if (g.tiles.some((t) => t.id === tileId)) return g.id;
    }
  }
  return null;
}
