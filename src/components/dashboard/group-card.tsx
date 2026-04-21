"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Copy as CopyIcon,
  GripVertical,
} from "lucide-react";
import type { GroupWithTiles } from "@/types";
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
import { TileCard } from "./tile-card";
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
  gridItemStyle,
} from "@/lib/grid";

type TileMoveTarget = { id: string; name: string; categoryName: string };

export function GroupCard({
  group,
  allGroups,
  onAddTile,
  dragHandle,
  resizeHandle,
  innerCols,
  innerRows,
}: {
  group: GroupWithTiles;
  allGroups: TileMoveTarget[];
  onAddTile: (groupId: string) => void;
  dragHandle?: React.ReactNode;
  resizeHandle?: React.ReactNode;
  /** How many columns the group's inner canvas has (clamped by parent). */
  innerCols: number;
  /** How many rows the group's inner canvas has (clamped by parent). */
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

  // Compact tile positions within the group's inner grid (innerCols columns).
  const tilesWithBox = group.tiles.map((tile) => {
    const box = getTileBox(tile);
    return { id: tile.id, tile, ...box };
  });
  const compactedTiles = compactLayout(tilesWithBox, Math.max(1, innerCols));
  const neededTileRows = layoutRows(compactedTiles);

  const headerStyle: React.CSSProperties | undefined = group.bgColor
    ? { backgroundColor: group.bgColor }
    : undefined;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group/card relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card",
              isEditing && "ring-1 ring-border/60",
            )}>
            {dragHandle}
            <div
              className="flex items-center gap-2 border-b px-3 py-2"
              style={headerStyle}>
              <DynamicIcon
                name={group.icon}
                iconUrl={group.iconUrl}
                className="size-4 text-muted-foreground"
              />
              <h3 className="flex-1 truncate text-xs font-medium">
                {group.name}
              </h3>
              {isEditing && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6"
                  onClick={() => onAddTile(group.id)}
                  title={t("tile.addTo")}>
                  <Plus className="size-3.5" />
                </Button>
              )}
            </div>

            {layout === "grid" ? (
              <GridCanvas
                cols={Math.max(1, innerCols)}
                rows={Math.max(innerRows, neededTileRows, 1)}
                showDots={isEditing}
                className="flex-1 p-2">
                {compactedTiles.map(({ id, tile, x, y, w, h }) => (
                  <div
                    key={id}
                    style={gridItemStyle({ x, y, w, h })}
                    className="min-h-0">
                    <TileCard
                      tile={tile}
                      mode="grid"
                      otherGroups={allGroups.filter((x) => x.id !== group.id)}
                    />
                  </div>
                ))}
                {group.tiles.length === 0 && isEditing && (
                  <div
                    className="col-start-1 row-start-1 flex items-center justify-center text-[10px] text-muted-foreground"
                    style={{
                      gridColumn: `1 / span ${Math.max(1, innerCols)}`,
                      gridRow: `1 / span ${Math.max(1, innerRows)}`,
                    }}>
                    {t("tile.emptyHint")}
                  </div>
                )}
              </GridCanvas>
            ) : (
              <div className="flex-1 space-y-2 overflow-auto p-2">
                {group.tiles.map((tile) => (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    mode="list"
                    otherGroups={allGroups.filter((x) => x.id !== group.id)}
                    dragHandle={
                      isEditing ? (
                        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
                      ) : undefined
                    }
                  />
                ))}
                {group.tiles.length === 0 && isEditing && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    {t("tile.emptyHint")}
                  </p>
                )}
              </div>
            )}
            {resizeHandle}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onAddTile(group.id)}>
            <Plus className="mr-2 size-4" />
            {t("tile.addTo")}
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
      <EditGroupDialog
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
