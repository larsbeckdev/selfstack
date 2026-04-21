"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Copy as CopyIcon,
  MoreHorizontal,
  LayoutGrid,
  Rows3,
  GripVertical,
} from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import { SortableTile } from "./sortable-tile";
import { EditGroupDialog } from "./edit-group-dialog";
import { useEditMode } from "./edit-mode-context";
import { deleteGroup, duplicateGroup, updateGroup } from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getGroupLayout, INNER_COLS, INNER_ROW_PX } from "@/lib/grid";

export function GroupCard({
  group,
  categoryId,
  allGroups,
  onAddTile,
  dragHandleProps,
}: {
  group: GroupWithTiles;
  categoryId: string;
  allGroups: { id: string; name: string; categoryName: string }[];
  onAddTile: (groupId: string) => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const isEditing = useEditMode();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const layout = getGroupLayout(group);
  const otherGroups = allGroups.filter((g) => g.id !== group.id);

  const { setNodeRef, isOver } = useDroppable({
    id: `group-drop:${group.id}`,
    data: { type: "group-drop", groupId: group.id, categoryId },
    disabled: !isEditing,
  });

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

  const handleToggleLayout = async () => {
    const next = layout === "grid" ? "list" : "grid";
    try {
      await updateGroup(group.id, { layout: next });
      router.refresh();
    } catch {
      toast.error(t("error.updateFailed"));
    }
  };

  return (
    <>
      <div className="flex flex-col">
        {/* header */}
        <div className="flex items-center gap-2 pb-2">
          {isEditing && (
            <button
              type="button"
              {...(dragHandleProps ?? {})}
              className="-ml-1 flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing touch-none"
              title={t("common.drag")}>
              <GripVertical className="size-3.5" />
            </button>
          )}
          <DynamicIcon
            name={group.icon}
            iconUrl={group.iconUrl}
            className="size-3.5 shrink-0 text-muted-foreground/70"
          />
          <h3 className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.name}
          </h3>
          {isEditing && (
            <div className="-mr-1 flex items-center">
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-muted-foreground"
                onClick={handleToggleLayout}
                title={
                  layout === "grid"
                    ? t("group.layoutList")
                    : t("group.layoutGrid")
                }>
                {layout === "grid" ? (
                  <Rows3 className="size-3" />
                ) : (
                  <LayoutGrid className="size-3" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-6 text-muted-foreground"
                onClick={() => onAddTile(group.id)}
                title={t("tile.addTo")}>
                <Plus className="size-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-6 text-muted-foreground"
                    title={t("common.moreActions")}>
                    <MoreHorizontal className="size-3" />
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
        <div
          ref={setNodeRef}
          className={cn(
            "rounded-lg transition-colors",
            isOver && isEditing && "bg-primary/5 ring-1 ring-primary/20",
          )}>
          <SortableContext
            items={group.tiles.map((tile) => tile.id)}
            strategy={
              layout === "grid"
                ? rectSortingStrategy
                : verticalListSortingStrategy
            }>
            {layout === "grid" ? (
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${INNER_COLS}, minmax(0, 1fr))`,
                  gridAutoRows: `${INNER_ROW_PX}px`,
                  gridAutoFlow: "dense",
                }}>
                {group.tiles.map((tile) => (
                  <SortableTile
                    key={tile.id}
                    tile={tile}
                    groupId={group.id}
                    categoryId={categoryId}
                    layout="grid"
                    otherGroups={otherGroups}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {group.tiles.map((tile) => (
                  <SortableTile
                    key={tile.id}
                    tile={tile}
                    groupId={group.id}
                    categoryId={categoryId}
                    layout="list"
                    otherGroups={otherGroups}
                  />
                ))}
              </div>
            )}
          </SortableContext>

          {group.tiles.length === 0 &&
            (isEditing ? (
              <button
                type="button"
                onClick={() => onAddTile(group.id)}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/50 py-5 text-xs text-muted-foreground/80 transition-colors",
                  "hover:border-border hover:bg-muted/40 hover:text-foreground",
                )}>
                <Plus className="size-3.5" />
                {t("tile.addTo")}
              </button>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground/60">
                {t("tile.emptyHint")}
              </div>
            ))}
        </div>
      </div>
      <EditGroupDialog
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
