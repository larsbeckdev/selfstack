"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Settings2, Check } from "lucide-react";
import type { BoardRole, BoardWithContents } from "@/types";
import { Button } from "@/components/ui/button";
import { DynamicIcon } from "@/components/dynamic-icon";
import { GridCanvas } from "./grid-canvas";
import { CategoryCard } from "./category-card";
import { EditModeProvider } from "./edit-mode-context";
import { AddCategoryDialog } from "./add-category-dialog";
import { AddGroupDialog } from "./add-group-dialog";
import { AddTileDialog } from "./add-tile-dialog";
import { BoardSettingsDialog } from "./board-settings-dialog";
import { useGridViewport } from "@/hooks/use-grid-viewport";
import { useTranslation } from "@/components/locale-provider";
import { compactLayout, gridItemStyle, layoutRows } from "@/lib/grid";

export function BoardView({
  board,
  boardRole = "viewer",
  forceReadonly = false,
}: {
  board: BoardWithContents;
  boardRole?: BoardRole;
  /** If true, disables all edit affordances regardless of role. */
  forceReadonly?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { cols: viewportCols } = useGridViewport();

  const canEdit =
    !forceReadonly && (boardRole === "owner" || boardRole === "editor");
  const isOwner = !forceReadonly && boardRole === "owner";

  const [isEditing, setIsEditing] = useState(false);
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

  // Compact categories at the viewport level (width clamped).
  const categoriesWithBox = useMemo(
    () =>
      board.categories.map((cat) => ({
        id: cat.id,
        category: cat,
        x: cat.x,
        y: cat.y,
        w: Math.min(cat.w, cappedCols),
        h: Math.max(1, cat.h),
      })),
    [board.categories, cappedCols],
  );
  const compactedCategories = useMemo(
    () => compactLayout(categoriesWithBox, cappedCols),
    [categoriesWithBox, cappedCols],
  );
  const totalRows = layoutRows(compactedCategories);

  // Flat list of all groups — used for the "move tile" submenu.
  const allGroups = useMemo(
    () =>
      board.categories.flatMap((c) =>
        c.groups.map((g) => ({
          id: g.id,
          name: g.name,
          categoryName: c.name,
        })),
      ),
    [board.categories],
  );

  const handleAddGroup = (categoryId: string) => {
    setTargetCategoryId(categoryId);
    setAddGroupOpen(true);
  };
  const handleAddTile = (groupId: string) => {
    setTargetGroupId(groupId);
    setAddTileOpen(true);
  };

  const exitEdit = () => {
    setIsEditing(false);
    router.refresh();
  };

  return (
    <EditModeProvider isEditing={canEdit && isEditing}>
      <div className="space-y-4">
        {/* Header */}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddCategoryOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  {t("category.addTo")}
                </Button>
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

        {/* Top-level grid canvas */}
        {board.categories.length === 0 ? (
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
              <div
                key={id}
                style={gridItemStyle({ x, y, w, h })}
                className="min-h-0">
                <CategoryCard
                  category={category}
                  allGroups={allGroups}
                  onAddGroup={handleAddGroup}
                  onAddTile={handleAddTile}
                  innerCols={w}
                  innerRows={Math.max(1, h - 1)}
                />
              </div>
            ))}
          </GridCanvas>
        )}

        {/* Dialogs */}
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
