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
  Maximize2,
  Minimize2,
  Move,
  Rows3,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
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
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type {
  BoardRole,
  BoardWithContents,
  CategoryWithGroups,
  GroupWithTiles,
} from "@/types";
import type { Tile } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DynamicIcon } from "@/components/dynamic-icon";
import { SortableCategory } from "./sortable-category";
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
import {
  reorderCategories,
  reorderGroups,
  reorderTiles,
  moveTileToGroup,
  setBoardLayoutMode,
  setCategoryPosition,
} from "@/lib/actions/board";
import { getCategoryWidth, getGroupLayout, CATEGORY_COLS } from "@/lib/grid";
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

  const [isEditing, setIsEditing] = useState(false);
  const [containerMode, setContainerMode] = useState<"fullwidth" | "boxed">(
    "fullwidth",
  );
  useEffect(() => {
    const saved = window.localStorage.getItem("board.layoutMode");
    if (saved === "boxed" || saved === "fullwidth") setContainerMode(saved);
  }, []);
  const toggleContainerMode = useCallback(() => {
    setContainerMode((prev) => {
      const next = prev === "fullwidth" ? "boxed" : "fullwidth";
      window.localStorage.setItem("board.layoutMode", next);
      return next;
    });
  }, []);

  // Position mode: "auto" (sortable flow) or "free" (snap-to-grid positioning)
  const [positionMode, setPositionMode] = useState<"auto" | "free">(
    (board.layoutMode as "auto" | "free") === "free" ? "free" : "auto",
  );
  useEffect(() => {
    setPositionMode(
      (board.layoutMode as "auto" | "free") === "free" ? "free" : "auto",
    );
  }, [board.layoutMode]);
  const togglePositionMode = useCallback(async () => {
    const next = positionMode === "auto" ? "free" : "auto";
    setPositionMode(next);
    try {
      await setBoardLayoutMode(board.id, next);
      router.refresh();
    } catch {
      toast.error(t("error.updateFailed"));
      setPositionMode(positionMode);
    }
  }, [positionMode, board.id, router, t]);
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
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // For tiles & free-positioned categories: prefer pointerWithin;
  // for auto-mode groups/categories: closestCenter works better.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (
        activeType === "tile" ||
        (activeType === "category" && positionMode === "free")
      ) {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) return pointerCollisions;
        return rectIntersection(args);
      }
      return closestCenter(args);
    },
    [activeType, positionMode],
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
          }
        | undefined;
      const type = aData?.type ?? null;
      setActiveId(null);
      setActiveType(null);

      if (!over) return;

      // ── Free-mode category reposition (snap to cell)
      if (type === "category" && positionMode === "free") {
        const oData = over.data.current as
          | { type?: string; x?: number; y?: number }
          | undefined;
        if (oData?.type !== "free-cell") return;
        const cat = categories.find((c) => c.id === active.id);
        if (!cat) return;
        const w = getCategoryWidth(cat.w);
        const newX = Math.max(0, Math.min(oData.x ?? 0, CATEGORY_COLS - w));
        const newY = Math.max(0, oData.y ?? 0);
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

      // ── Category reorder (auto mode, sortable)
      if (type === "category") {
        if (active.id === over.id) return;
        const oldIdx = categories.findIndex((c) => c.id === active.id);
        const newIdx = categories.findIndex((c) => c.id === over.id);
        if (oldIdx < 0 || newIdx < 0) return;
        const next = arrayMove(categories, oldIdx, newIdx);
        setCategories(next);
        dirtyRef.current = true;
        try {
          await reorderCategories(
            board.id,
            next.map((c) => c.id),
          );
          dirtyRef.current = false;
          router.refresh();
        } catch {
          toast.error(t("error.updateFailed"));
        }
        return;
      }

      // ── Group reorder (within a single category)
      if (type === "group") {
        const activeCatId = aData?.categoryId ?? null;
        const overData = over.data.current as
          | { type?: string; categoryId?: string }
          | undefined;
        const overCatId = overData?.categoryId ?? activeCatId;
        if (!activeCatId || activeCatId !== overCatId) return;
        const cat = categories.find((c) => c.id === activeCatId);
        if (!cat) return;
        const oldIdx = cat.groups.findIndex((g) => g.id === active.id);
        const newIdx = cat.groups.findIndex((g) => g.id === over.id);
        if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
        const nextGroups = arrayMove(cat.groups, oldIdx, newIdx);
        const next = categories.map((c) =>
          c.id === activeCatId ? { ...c, groups: nextGroups } : c,
        );
        setCategories(next);
        dirtyRef.current = true;
        try {
          await reorderGroups(
            activeCatId,
            nextGroups.map((g) => g.id),
          );
          dirtyRef.current = false;
          router.refresh();
        } catch {
          toast.error(t("error.updateFailed"));
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
          | { type?: string; groupId?: string }
          | undefined;

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
            allGroups={allGroups}
            onAddGroup={() => {}}
            onAddTile={() => {}}
          />
        </div>
      );
    }
    if (activeType === "group") {
      let group: GroupWithTiles | null = null;
      let catId = "";
      for (const c of categories) {
        const g = c.groups.find((x) => x.id === activeId);
        if (g) {
          group = g;
          catId = c.id;
          break;
        }
      }
      if (!group) return null;
      return (
        <div style={{ width: 280, opacity: 0.95 }}>
          <GroupCard
            group={group}
            categoryId={catId}
            allGroups={allGroups}
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
                <TileCard
                  tile={tile}
                  layout={getGroupLayout(g)}
                  otherGroups={[]}
                />
              </div>
            );
          }
        }
      }
    }
    return null;
  }, [activeId, activeType, categories, allGroups]);

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
        <div
          className={cn(
            "space-y-4",
            containerMode === "boxed" && "mx-auto max-w-screen-xl",
          )}>
          {/* board header */}
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
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleContainerMode}
              title={
                containerMode === "fullwidth"
                  ? t("board.layoutBoxed")
                  : t("board.layoutFullwidth")
              }>
              {containerMode === "fullwidth" ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </Button>
            {canEdit && isEditing && (
              <Button
                size="icon"
                variant={positionMode === "free" ? "default" : "ghost"}
                onClick={togglePositionMode}
                title={
                  positionMode === "free"
                    ? t("board.positionAuto")
                    : t("board.positionFree")
                }>
                {positionMode === "free" ? (
                  <Rows3 className="size-4" />
                ) : (
                  <Move className="size-4" />
                )}
              </Button>
            )}
            {canEdit && (
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    variant="default"
                    title={t("common.done")}>
                    <Check className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t("common.done")}</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    title={t("board.editMode")}>
                    <Pencil className="size-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {t("board.editMode")}
                    </span>
                  </Button>
                )}
                {isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-2 size-4" />
                        {t("common.add")}
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
          ) : positionMode === "free" ? (
            <div
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
                  allGroups={allGroups}
                  onAddGroup={handleAddGroup}
                  onAddTile={handleAddTile}
                />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "grid grid-cols-1 gap-4 rounded-xl md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
                isEditing && "p-3 bg-edit-grid",
              )}
              style={{ gridAutoFlow: "dense" }}>
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={undefined}>
                {categories.map((cat) => {
                  const width = getCategoryWidth(cat.w);
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        // base: always 1 col on narrow screens
                        // md (2 cols): cap at 2
                        width >= 2 && "md:col-span-2",
                        // xl (3 cols): cap at 3
                        width === 2 && "xl:col-span-2",
                        width >= 3 && "xl:col-span-3",
                        // 2xl (4 cols): full 1..4
                        width === 2 && "2xl:col-span-2",
                        width === 3 && "2xl:col-span-3",
                        width === 4 && "2xl:col-span-4",
                      )}>
                      <SortableCategory
                        category={cat}
                        allGroups={allGroups}
                        onAddGroup={handleAddGroup}
                        onAddTile={handleAddTile}
                      />
                    </div>
                  );
                })}
              </SortableContext>
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
