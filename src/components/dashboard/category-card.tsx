"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Copy as CopyIcon,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import type { CategoryWithGroups } from "@/types";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const dragEnabled = drag?.enabled ?? false;

  return (
    <>
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-2xl",
          "bg-card border border-border/50 shadow-sm",
          "transition-shadow",
          isEditing && "hover:shadow-md",
          isDragging && "shadow-2xl ring-2 ring-primary",
          isResizing && "shadow-lg ring-2 ring-primary",
        )}>
        {/* colored top accent */}
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: category.color }}
          aria-hidden
        />

        {/* header (drag handle in edit mode) */}
        <div
          {...(dragEnabled ? drag!.dragHandleProps : {})}
          className={cn(
            "flex items-center gap-3 px-5 py-3.5",
            dragEnabled && "cursor-grab select-none active:cursor-grabbing",
          )}>
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${category.color}1f`,
              color: category.color,
            }}>
            <DynamicIcon
              name={category.icon}
              iconUrl={category.iconUrl}
              className="size-4"
            />
          </div>
          <h2 className="flex-1 truncate text-base font-semibold">
            {category.name}
          </h2>
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAddGroup(category.id)}
                title={t("group.addTo")}>
                <Plus className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onPointerDown={(e) => e.stopPropagation()}
                    title={t("common.moreActions")}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 size-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <CopyIcon className="mr-2 size-4" />
                    {t("common.duplicate")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleDelete}>
                    <Trash2 className="mr-2 size-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* body */}
        <GridCanvas
          cols={cappedCols}
          rows={Math.max(innerRows, neededRows, 1)}
          showDots={isEditing}
          className="flex-1 pb-2">
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
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onAddGroup(category.id)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl",
                "border-2 border-dashed border-border/60 text-sm text-muted-foreground",
                "transition-colors hover:border-primary/60 hover:text-primary hover:bg-primary/5",
              )}
              style={{
                gridColumn: `1 / span ${cappedCols}`,
                gridRow: `1 / span ${Math.max(1, innerRows)}`,
              }}>
              <Plus className="size-4" />
              {t("group.addTo")}
            </button>
          )}
        </GridCanvas>

        {/* resize corner — always visible while editing */}
        {isEditing && drag?.resizeHandleProps && (
          <div
            {...drag.resizeHandleProps}
            className={cn(
              drag.resizeHandleProps.className,
              "absolute bottom-0 right-0 z-10 size-6 rounded-tl-xl",
              "bg-muted/60 hover:bg-primary/20",
              "transition-colors",
              isResizing && "bg-primary/20",
              "after:absolute after:bottom-1 after:right-1 after:size-0",
              "after:border-b-[10px] after:border-r-[10px] after:border-t-[10px] after:border-l-[10px]",
              "after:border-transparent after:border-b-foreground/60 after:border-r-foreground/60",
            )}
            title={t("common.resize")}
          />
        )}
      </div>
      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
