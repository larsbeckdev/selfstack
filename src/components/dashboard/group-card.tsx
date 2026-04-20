"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Plus,
} from "lucide-react";
import type { CategoryWithGroups, GroupWithTiles } from "@/types";
import { deleteGroup, duplicateGroup } from "@/lib/actions/board";
import { getTileSize } from "@/lib/tile-size";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableTile } from "./sortable-tile";
import { EditGroupDialog } from "./edit-group-dialog";
import { AddTileDialog } from "./add-tile-dialog";
import { useEditMode } from "./edit-mode-context";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function GroupCard({
  group,
  categoryId,
  dragHandleProps,
}: {
  group: GroupWithTiles;
  categoryId?: string;
  dragHandleProps?: Record<string, unknown>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [addTileOpen, setAddTileOpen] = useState(false);
  const isEditing = useEditMode();
  const router = useRouter();
  const { t } = useTranslation();

  // Sub-grid width: number of columns inside the group.
  const groupCols = Math.max(
    1,
    (group as GroupWithTiles & { w?: number }).w ?? 2,
  );

  // Render as vertical list when there are tiles and ALL of them are sized "list".
  const allList =
    group.tiles.length > 0 &&
    group.tiles.every((tile) => getTileSize(tile) === "list");

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `group-droppable-${group.id}`,
    data: { type: "group-droppable", groupId: group.id },
    disabled: !isEditing,
  });

  const handleDelete = async () => {
    try {
      await deleteGroup(group.id);
      router.refresh();
      toast.success(t("group.deleted"));
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  return (
    <>
      <div className="rounded-lg bg-card shadow-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          {isEditing && dragHandleProps && (
            <button
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...dragHandleProps}>
              <GripVertical className="size-3.5" />
            </button>
          )}
          <DynamicIcon
            name={group.icon}
            iconUrl={group.iconUrl}
            className="size-3.5 text-muted-foreground"
          />
          <h3 className="flex-1 text-xs font-medium">{group.name}</h3>
          <span className="text-[10px] text-muted-foreground">
            {group.tiles.length} {t("group.tileCount")}
          </span>

          {isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  <MoreHorizontal className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 size-3.5" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await duplicateGroup(group.id);
                      router.refresh();
                      toast.success(t("group.duplicated"));
                    } catch {
                      toast.error(t("error.duplicateFailed"));
                    }
                  }}>
                  <Copy className="mr-2 size-3.5" />
                  {t("common.duplicate")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive">
                  <Trash2 className="mr-2 size-3.5" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <SortableContext
          items={group.tiles.map((t) => t.id)}
          strategy={
            allList ? verticalListSortingStrategy : rectSortingStrategy
          }>
          <div
            ref={setDroppableRef}
            className={[
              allList
                ? "flex flex-col divide-y divide-border/30 px-3 pb-3"
                : "grid gap-3 px-3 pb-3",
              isEditing && group.tiles.length === 0 ? "min-h-[48px]" : "",
              isEditing
                ? "bg-edit-grid rounded-b-md border-t border-dashed border-border/40 pt-3"
                : "",
            ].join(" ")}
            style={
              !allList
                ? {
                    gridTemplateColumns: `repeat(${groupCols}, minmax(0, 1fr))`,
                    gridAutoRows: "minmax(0, auto)",
                  }
                : undefined
            }>
            {group.tiles.map((tile) => (
              <SortableTile
                key={tile.id}
                tile={tile}
                groupId={group.id}
                groupCols={groupCols}
              />
            ))}
            {group.tiles.length === 0 && (
              <p className="w-full py-2 text-center text-xs text-muted-foreground">
                {t("group.noTiles")}
              </p>
            )}
          </div>
        </SortableContext>

        {isEditing && (
          <div className="px-3 pb-3">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setAddTileOpen(true)}>
              <Plus className="mr-1 size-3.5" />
              {t("tile.addTile")}
            </Button>
          </div>
        )}
      </div>

      <EditGroupDialog
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AddTileDialog
        categories={[
          {
            id: categoryId ?? "",
            name: "",
            icon: "folder",
            iconUrl: null,
            color: "#6366f1",
            columns: 1,
            order: 0,
            boardId: "",
            groups: [group],
          } satisfies CategoryWithGroups,
        ]}
        defaultGroupId={group.id}
        open={addTileOpen}
        onOpenChange={setAddTileOpen}
      />
    </>
  );
}
