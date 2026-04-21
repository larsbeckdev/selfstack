"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { BoardRole, BoardWithContents, CategoryWithGroups } from "@/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DynamicIcon } from "@/components/dynamic-icon";
import { GridCanvas } from "./grid-canvas";
import { CategoryCard } from "./category-card";
import { DraggableItem } from "./draggable-item";
import { EditModeProvider } from "./edit-mode-context";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddGroupDialog } from "./add-group-dialog";
import { AddTileDialog } from "./add-tile-dialog";
import { BoardSettingsDialog } from "./board-settings-dialog";
import { useGridViewport } from "@/hooks/use-grid-viewport";
import { useTranslation } from "@/components/locale-provider";
import {
  compactWithPriority,
  getTileBox,
  layoutRows,
  CATEGORY_HEADER_ROWS,
  GROUP_HEADER_ROWS,
  type GridBox,
} from "@/lib/grid";
import { syncBoardLayout } from "@/lib/actions/board";
import { toast } from "sonner";

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
  const { t } = useTranslation();
  const { cols: viewportCols } = useGridViewport();

  const canEdit =
    !forceReadonly && (boardRole === "owner" || boardRole === "editor");
  const isOwner = !forceReadonly && boardRole === "owner";

  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<CategoryWithGroups[]>(
    board.categories,
  );
  const dirtyRef = useRef(false);

  // Adopt server snapshot while clean; ignore while user has pending edits.
  useEffect(() => {
    if (!dirtyRef.current) setCategories(board.categories);
  }, [board.categories]);

  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addTileOpen, setAddTileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string | undefined>(
    undefined,
  );
  const [targetGroupId, setTargetGroupId] = useState<string | undefined>(
    undefined,
  );

  const cappedCols = Math.max(1, viewportCols);

  const compactedCategories = useMemo(() => {
    const items = categories.map((cat) => {
      const innerCols = Math.max(1, Math.min(cat.w, cappedCols));
      // Compute the minimum h this category needs so groups fit inside.
      let neededInnerRows = 0;
      for (const g of cat.groups) {
        const gh = Math.max(1, g.h);
        // tiles inside the group push the group height up too
        const tileBoxes = g.tiles.map((tile) => ({
          id: tile.id,
          ...getTileBox(tile),
        }));
        const tileRows = tileBoxes.reduce((m, b) => Math.max(m, b.y + b.h), 0);
        const groupH = Math.max(gh, tileRows + GROUP_HEADER_ROWS);
        neededInnerRows = Math.max(neededInnerRows, g.y + groupH);
      }
      const minH = neededInnerRows + CATEGORY_HEADER_ROWS;
      return {
        id: cat.id,
        category: cat,
        x: cat.x,
        y: cat.y,
        w: Math.min(cat.w, cappedCols),
        h: Math.max(cat.h, minH, 1),
        innerCols,
      };
    });
    return compactWithPriority(items, cappedCols);
  }, [categories, cappedCols]);
  const totalRows = layoutRows(compactedCategories);

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

  const markDirty = () => {
    dirtyRef.current = true;
  };

  const mutateCategory = useCallback(
    (id: string, box: GridBox) => {
      markDirty();
      setCategories((prev) => {
        const next = prev.map((c) =>
          c.id === id ? { ...c, x: box.x, y: box.y, w: box.w, h: box.h } : c,
        );
        const withBox = next.map((c) => ({
          id: c.id,
          category: c,
          x: c.x,
          y: c.y,
          w: Math.min(c.w, cappedCols),
          h: Math.max(1, c.h),
        }));
        const compacted = compactWithPriority(withBox, cappedCols, id);
        return compacted.map((it) => ({
          ...it.category,
          x: it.x,
          y: it.y,
          w: it.w,
          h: it.h,
        }));
      });
    },
    [cappedCols],
  );

  const mutateGroup = useCallback(
    (categoryId: string, groupId: string, box: GridBox) => {
      markDirty();
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== categoryId) return c;
          const innerCols = Math.max(1, Math.min(c.w, cappedCols));
          const groups = c.groups.map((g) =>
            g.id === groupId
              ? { ...g, x: box.x, y: box.y, w: box.w, h: box.h }
              : g,
          );
          const withBox = groups.map((g) => ({
            id: g.id,
            group: g,
            x: g.x,
            y: g.y,
            w: Math.min(g.w, innerCols),
            h: Math.max(1, g.h),
          }));
          const compacted = compactWithPriority(withBox, innerCols, groupId);
          const usedRows = layoutRows(compacted);
          const minOuterH = usedRows + CATEGORY_HEADER_ROWS;
          return {
            ...c,
            h: Math.max(c.h, minOuterH),
            groups: compacted.map((it) => ({
              ...it.group,
              x: it.x,
              y: it.y,
              w: it.w,
              h: it.h,
            })),
          };
        }),
      );
    },
    [cappedCols],
  );

  const mutateTile = useCallback(
    (categoryId: string, groupId: string, tileId: string, box: GridBox) => {
      markDirty();
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== categoryId) return c;
          let categoryGrowth = 0;
          const newGroups = c.groups.map((g) => {
            if (g.id !== groupId) return g;
            const innerCols = Math.max(1, g.w);
            const tiles = g.tiles.map((tile) =>
              tile.id === tileId ? { ...tile, x: box.x, y: box.y } : tile,
            );
            const withBox = tiles.map((tile) => ({
              id: tile.id,
              tile,
              ...getTileBox(tile),
            }));
            const compacted = compactWithPriority(withBox, innerCols, tileId);
            const usedRows = layoutRows(compacted);
            const minGroupH = usedRows + GROUP_HEADER_ROWS;
            const newH = Math.max(g.h, minGroupH);
            categoryGrowth = Math.max(
              categoryGrowth,
              g.y + newH + CATEGORY_HEADER_ROWS,
            );
            return {
              ...g,
              h: newH,
              tiles: compacted.map((it) => ({
                ...it.tile,
                x: it.x,
                y: it.y,
              })),
            };
          });
          return {
            ...c,
            h: Math.max(c.h, categoryGrowth),
            groups: newGroups,
          };
        }),
      );
    },
    [],
  );

  const handleAddGroup = (categoryId: string) => {
    setTargetCategoryId(categoryId);
    setAddGroupOpen(true);
  };
  const handleAddTile = (groupId: string) => {
    setTargetGroupId(groupId);
    setAddTileOpen(true);
  };

  const exitEdit = async () => {
    if (!dirtyRef.current) {
      setIsEditing(false);
      return;
    }
    try {
      const cats = categories.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
      }));
      const grps = categories.flatMap((c) =>
        c.groups.map((g) => ({
          id: g.id,
          x: g.x,
          y: g.y,
          w: g.w,
          h: g.h,
        })),
      );
      const tls = categories.flatMap((c) =>
        c.groups.flatMap((g) =>
          g.tiles.map((tile) => ({ id: tile.id, x: tile.x, y: tile.y })),
        ),
      );
      await syncBoardLayout(board.id, {
        categories: cats,
        groups: grps,
        tiles: tls,
      });
      dirtyRef.current = false;
      toast.success(t("board.saved"));
    } catch {
      toast.error(t("error.updateFailed"));
    } finally {
      setIsEditing(false);
      router.refresh();
    }
  };

  return (
    <EditModeProvider isEditing={canEdit && isEditing}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
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
                <Button size="sm" onClick={exitEdit} variant="default">
                  <Check className="mr-2 size-4" />
                  {t("common.done")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}>
                  <Pencil className="mr-2 size-4" />
                  {t("board.editMode")}
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
                    <DropdownMenuItem onClick={() => setAddCategoryOpen(true)}>
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
          <GridCanvas
            cols={cappedCols}
            rows={Math.max(totalRows, 1)}
            showDots={canEdit && isEditing}
            className="w-full">
            {compactedCategories.map(({ id, category, x, y, w, h }) => (
              <DraggableItem
                key={id}
                box={{ x, y, w, h }}
                canvasCols={cappedCols}
                enabled={canEdit && isEditing}
                canResize
                minW={2}
                minH={2}
                onDragEnd={(b) => mutateCategory(id, b)}
                onResizeEnd={(b) => mutateCategory(id, b)}>
                <CategoryCard
                  category={category}
                  allGroups={allGroups}
                  onAddGroup={handleAddGroup}
                  onAddTile={handleAddTile}
                  onMoveGroup={(gid, b) => mutateGroup(id, gid, b)}
                  onResizeGroup={(gid, b) => mutateGroup(id, gid, b)}
                  onMoveTile={(gid, tid, b) => mutateTile(id, gid, tid, b)}
                  innerCols={w}
                  innerRows={Math.max(1, h - 1)}
                />
              </DraggableItem>
            ))}
          </GridCanvas>
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
    </EditModeProvider>
  );
}
