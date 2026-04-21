"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Copy as CopyIcon,
  MoreHorizontal,
} from "lucide-react";
import type { GroupWithTiles } from "@/types";
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
import { TileCard } from "./tile-card";
import { DraggableItem, useDrag } from "./draggable-item";
import { EditGroupDialog } from "./edit-group-dialog";
import { useEditMode } from "./edit-mode-context";
import { deleteGroup, duplicateGroup } from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  compactLayout,
  getGroupLayout,
  getTileBox,
  layoutRows,
  type GridBox,
} from "@/lib/grid";

type TileMoveTarget = { id: string; name: string; categoryName: string };

export function GroupCard({
  group,
  allGroups,
  onAddTile,
  onMoveTile,
  innerCols,
  innerRows,
}: {
  group: GroupWithTiles;
  allGroups: TileMoveTarget[];
  onAddTile: (groupId: string) => void;
  onMoveTile?: (groupId: string, tileId: string, box: GridBox) => void;
  innerCols: number;
  innerRows: number;
}) {
  const isEditing = useEditMode();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const layout = getGroupLayout(group);

  const handleDuplicate = async () => {
    try {
      await duplicateGroup(group.id);
      toast.success(t("group.duplicated"));
      router.refresh();
    } catch {
      toast.error(t("error.duplicateFailed"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroup(group.id);
      toast.success(t("group.deleted"));
      router.refresh();
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  const tilesWithBox = group.tiles.map((tile) => {
    const box = getTileBox(tile);
    return { id: tile.id, tile, ...box };
  });
  const compactedTiles = compactLayout(tilesWithBox, Math.max(1, innerCols));
  const neededTileRows = layoutRows(compactedTiles);

  const drag = useDrag();
  const isDragging = drag?.isDragging ?? false;
  const isResizing = drag?.isResizing ?? false;
  const dragEnabled = drag?.enabled ?? false;

  const headerAccent = group.bgColor;

  return (
    <>
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden rounded-xl",
          "bg-muted/40 transition-all",
          isEditing && "hover:bg-muted/60",
          isDragging && "bg-card shadow-2xl ring-2 ring-primary",
          isResizing && "ring-2 ring-primary shadow-lg",
        )}>
        {/* header acts as drag handle */}
        <div
          {...(dragEnabled ? drag!.dragHandleProps : {})}
          className={cn(
            "relative flex items-center gap-2 px-3 pt-2.5 pb-1.5",
            dragEnabled && "cursor-grab select-none active:cursor-grabbing",
          )}>
          {headerAccent && (
            <span
              className="absolute inset-x-3 top-0 h-[3px] rounded-b-full"
              style={{ backgroundColor: headerAccent }}
              aria-hidden
            />
          )}
          <DynamicIcon
            name={group.icon}
            iconUrl={group.iconUrl}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <h3 className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.name}
          </h3>
          {isEditing && (
            <div className="flex items-center">
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAddTile(group.id)}
                title={t("tile.addTo")}>
                <Plus className="size-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onPointerDown={(e) => e.stopPropagation()}
                    title={t("common.moreActions")}>
                    <MoreHorizontal className="size-3.5" />
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
        {layout === "grid" ? (
          <GridCanvas
            cols={Math.max(1, innerCols)}
            rows={Math.max(innerRows, neededTileRows, 1)}
            showDots={isEditing}
            className="flex-1">
            {compactedTiles.map(({ id, tile, x, y, w, h }) => (
              <DraggableItem
                key={id}
                box={{ x, y, w, h }}
                canvasCols={Math.max(1, innerCols)}
                enabled={isEditing}
                onDragEnd={(b) => onMoveTile?.(group.id, id, b)}>
                <TileCard
                  tile={tile}
                  mode="grid"
                  otherGroups={allGroups.filter((x) => x.id !== group.id)}
                />
              </DraggableItem>
            ))}
            {group.tiles.length === 0 && isEditing && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAddTile(group.id)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg",
                  "border-2 border-dashed border-border/60 text-[11px] text-muted-foreground",
                  "transition-colors hover:border-primary/60 hover:text-primary hover:bg-primary/5",
                )}
                style={{
                  gridColumn: `1 / span ${Math.max(1, innerCols)}`,
                  gridRow: `1 / span ${Math.max(1, innerRows)}`,
                }}>
                <Plus className="size-3.5" />
                {t("tile.addTo")}
              </button>
            )}
          </GridCanvas>
        ) : (
          <div className="flex-1 space-y-1.5 overflow-auto px-2 pb-2">
            {group.tiles.map((tile) => (
              <TileCard
                key={tile.id}
                tile={tile}
                mode="list"
                otherGroups={allGroups.filter((x) => x.id !== group.id)}
              />
            ))}
            {group.tiles.length === 0 && isEditing && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAddTile(group.id)}
                className={cn(
                  "flex w-full items-center justify-center gap-1 rounded-md py-3",
                  "border-2 border-dashed border-border/60 text-xs text-muted-foreground",
                  "transition-colors hover:border-primary/60 hover:text-primary hover:bg-primary/5",
                )}>
                <Plus className="size-3.5" />
                {t("tile.addTo")}
              </button>
            )}
          </div>
        )}

        {/* resize corner — always visible while editing */}
        {isEditing && drag?.resizeHandleProps && (
          <div
            {...drag.resizeHandleProps}
            className={cn(
              drag.resizeHandleProps.className,
              "absolute bottom-0 right-0 z-10 size-5 rounded-tl-md",
              "bg-background/80 hover:bg-primary/20",
              "transition-colors",
              isResizing && "bg-primary/20",
              "after:absolute after:bottom-0.5 after:right-0.5 after:size-0",
              "after:border-b-[8px] after:border-r-[8px] after:border-t-[8px] after:border-l-[8px]",
              "after:border-transparent after:border-b-foreground/60 after:border-r-foreground/60",
            )}
            title={t("common.resize")}
          />
        )}
      </div>
      <EditGroupDialog
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
