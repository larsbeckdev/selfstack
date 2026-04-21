"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Copy as CopyIcon } from "lucide-react";
import type { CategoryWithGroups } from "@/types";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { GridCanvas } from "./grid-canvas";
import { GroupCard } from "./group-card";
import { DraggableItem, useDrag } from "./draggable-item";
import { EditCategoryDialog } from "./edit-category-dialog";
import { useEditMode } from "./edit-mode-context";
import { deleteCategory, duplicateCategory } from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  compactLayout,
  getTileBox,
  layoutRows,
  GROUP_HEADER_ROWS,
  type GridBox,
} from "@/lib/grid";

type TileMoveTarget = { id: string; name: string; categoryName: string };

export function CategoryCard({
  category,
  allGroups,
  onAddGroup,
  onAddTile,
  onMoveGroup,
  onResizeGroup,
  onMoveTile,
  innerCols,
  innerRows,
}: {
  category: CategoryWithGroups;
  allGroups: TileMoveTarget[];
  onAddGroup: (categoryId: string) => void;
  onAddTile: (groupId: string) => void;
  onMoveGroup?: (groupId: string, box: GridBox) => void;
  onResizeGroup?: (groupId: string, box: GridBox) => void;
  onMoveTile?: (groupId: string, tileId: string, box: GridBox) => void;
  innerCols: number;
  innerRows: number;
}) {
  const isEditing = useEditMode();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleDuplicate = async () => {
    try {
      await duplicateCategory(category.id);
      toast.success(t("category.duplicated"));
      router.refresh();
    } catch {
      toast.error(t("error.duplicateFailed"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      toast.success(t("category.deleted"));
      router.refresh();
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  const cappedCols = Math.max(1, innerCols);
  // Clamp group widths and heights to the available canvas, then compact.
  const groupsWithBox = category.groups.map((group) => {
    const tileRows = group.tiles.reduce((m, tile) => {
      const b = getTileBox(tile);
      return Math.max(m, b.y + b.h);
    }, 0);
    const minH = Math.max(1, group.h, tileRows + GROUP_HEADER_ROWS);
    return {
      id: group.id,
      group,
      x: group.x,
      y: group.y,
      w: Math.min(group.w, cappedCols),
      h: minH,
    };
  });
  const compactedGroups = compactLayout(groupsWithBox, cappedCols);
  const neededRows = layoutRows(compactedGroups);

  const drag = useDrag();
  const isDragging = drag?.isDragging ?? false;
  const isResizing = drag?.isResizing ?? false;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group/card relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card/80 backdrop-blur-sm shadow-sm transition-shadow",
              isEditing &&
                "hover:shadow-md hover:ring-1 hover:ring-primary/40",
              isDragging && "ring-2 ring-primary shadow-2xl",
              isResizing && "ring-2 ring-primary shadow-lg",
            )}>
            <div
              {...(drag?.enabled ? drag.dragHandleProps : {})}
              className={cn(
                "flex items-center gap-3 px-5 py-4",
                drag?.enabled &&
                  "cursor-grab select-none active:cursor-grabbing",
              )}
              style={{
                background: `linear-gradient(135deg, ${category.color}14, transparent 60%)`,
              }}>
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${category.color}22`,
                  color: category.color,
                }}>
                <DynamicIcon
                  name={category.icon}
                  iconUrl={category.iconUrl}
                  className="size-4"
                />
              </div>
              <h2 className="flex-1 truncate text-base font-semibold tracking-tight">
                {category.name}
              </h2>
              {isEditing && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 shrink-0"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onAddGroup(category.id)}
                  title={t("group.addTo")}>
                  <Plus className="size-4" />
                </Button>
              )}
            </div>

            <GridCanvas
              cols={cappedCols}
              rows={Math.max(innerRows, neededRows, 1)}
              showDots={isEditing}
              className="flex-1 px-4 pb-4 pt-3">
              {compactedGroups.map(({ id, group, x, y, w, h }) => (
                <DraggableItem
                  key={id}
                  box={{ x, y, w, h }}
                  canvasCols={cappedCols}
                  enabled={isEditing}
                  canResize
                  minW={1}
                  minH={2}
                  onDragEnd={(b) => onMoveGroup?.(id, b)}
                  onResizeEnd={(b) => onResizeGroup?.(id, b)}>
                  <GroupCard
                    group={group}
                    allGroups={allGroups}
                    onAddTile={onAddTile}
                    onMoveTile={onMoveTile}
                    innerCols={w}
                    innerRows={Math.max(1, h - 1)}
                  />
                </DraggableItem>
              ))}
              {category.groups.length === 0 && isEditing && (
                <div
                  className="flex items-center justify-center rounded-lg border-2 border-dashed border-border/60 text-xs text-muted-foreground"
                  style={{
                    gridColumn: `1 / span ${cappedCols}`,
                    gridRow: `1 / span ${Math.max(1, innerRows)}`,
                  }}>
                  {t("group.emptyHint")}
                </div>
              )}
            </GridCanvas>
            {drag?.resizeHandleProps && (
              <div
                {...drag.resizeHandleProps}
                className={cn(
                  drag.resizeHandleProps.className,
                  "absolute bottom-0 right-0 z-10 size-5 rounded-tl-lg bg-muted/70",
                  "opacity-0 transition-opacity group-hover/card:opacity-100",
                  (isDragging || isResizing) && "opacity-100",
                  "after:absolute after:bottom-1 after:right-1 after:size-0",
                  "after:border-b-[8px] after:border-r-[8px] after:border-t-[8px] after:border-l-[8px]",
                  "after:border-transparent after:border-b-muted-foreground after:border-r-muted-foreground",
                )}
              />
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onAddGroup(category.id)}>
            <Plus className="mr-2 size-4" />
            {t("group.addTo")}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" />
            {t("common.edit")}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDuplicate}>
            <CopyIcon className="mr-2 size-4" />
            {t("common.duplicate")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 size-4" />
            {t("common.delete")}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
