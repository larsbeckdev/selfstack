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
import { EditCategoryDialog } from "./edit-category-dialog";
import { useEditMode } from "./edit-mode-context";
import { deleteCategory, duplicateCategory } from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compactLayout, gridItemStyle, layoutRows } from "@/lib/grid";

type TileMoveTarget = { id: string; name: string; categoryName: string };

export function CategoryCard({
  category,
  allGroups,
  onAddGroup,
  onAddTile,
  dragHandle,
  resizeHandle,
  innerCols,
  innerRows,
}: {
  category: CategoryWithGroups;
  allGroups: TileMoveTarget[];
  onAddGroup: (categoryId: string) => void;
  onAddTile: (groupId: string) => void;
  dragHandle?: React.ReactNode;
  resizeHandle?: React.ReactNode;
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
  const groupsWithBox = category.groups.map((group) => ({
    id: group.id,
    group,
    x: group.x,
    y: group.y,
    w: Math.min(group.w, cappedCols),
    h: Math.max(1, group.h),
  }));
  const compactedGroups = compactLayout(groupsWithBox, cappedCols);
  const neededRows = layoutRows(compactedGroups);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card",
              isEditing && "ring-1 ring-border/60",
            )}
            style={{
              borderLeftColor: category.color,
              borderLeftWidth: 4,
            }}>
            {dragHandle}
            <div className="flex items-center gap-2 px-4 py-3">
              <DynamicIcon
                name={category.icon}
                iconUrl={category.iconUrl}
                className="size-4"
                style={{ color: category.color }}
              />
              <h2 className="flex-1 truncate text-sm font-semibold">
                {category.name}
              </h2>
              {isEditing && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
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
              className="flex-1 px-4 pb-4">
              {compactedGroups.map(({ id, group, x, y, w, h }) => (
                <div
                  key={id}
                  style={gridItemStyle({ x, y, w, h })}
                  className="min-h-0">
                  <GroupCard
                    group={group}
                    allGroups={allGroups}
                    onAddTile={onAddTile}
                    innerCols={w}
                    innerRows={Math.max(1, h - 1)}
                  />
                </div>
              ))}
              {category.groups.length === 0 && isEditing && (
                <div
                  className="flex items-center justify-center text-xs text-muted-foreground"
                  style={{
                    gridColumn: `1 / span ${cappedCols}`,
                    gridRow: `1 / span ${Math.max(1, innerRows)}`,
                  }}>
                  {t("group.emptyHint")}
                </div>
              )}
            </GridCanvas>
            {resizeHandle}
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
