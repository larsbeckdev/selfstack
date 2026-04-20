"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import type { CategoryWithGroups } from "@/types";
import { deleteCategory, duplicateCategory } from "@/lib/actions/board";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SortableGroup } from "./sortable-group";
import { EditCategoryDialog } from "./edit-category-dialog";
import { AddGroupDialog } from "./add-group-dialog";
import { AddTileDialog } from "./add-tile-dialog";
import { useEditMode } from "./edit-mode-context";
import { useBoardColumnsContext } from "./board-columns-context";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function CategoryCard({
  category,
  isDragOverlay = false,
  dragHandleProps,
}: {
  category: CategoryWithGroups;
  isDragOverlay?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addTileOpen, setAddTileOpen] = useState(false);
  const isEditing = useEditMode();
  const router = useRouter();
  const { t } = useTranslation();
  const { columns: boardColumns } = useBoardColumnsContext();

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      router.refresh();
      toast.success(t("category.deleted"));
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-lg border bg-card shadow-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            {isEditing && dragHandleProps && (
              <button
                className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                {...dragHandleProps}>
                <GripVertical className="size-4" />
              </button>
            )}

            <CollapsibleTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                {open ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronRight className="size-4" />
                )}
              </button>
            </CollapsibleTrigger>

            <div
              className="flex size-6 items-center justify-center rounded"
              style={{ backgroundColor: category.color + "18" }}>
              <DynamicIcon
                name={category.icon}
                iconUrl={category.iconUrl}
                className="size-3.5"
                style={{ color: category.color }}
              />
            </div>
            <h2 className="flex-1 text-sm font-semibold">{category.name}</h2>
            <span className="text-xs text-muted-foreground">
              {category.groups.length} {t("category.groups")}
            </span>

            {!isDragOverlay && isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7">
                    <MoreHorizontal className="size-3.5" />
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
                        await duplicateCategory(category.id);
                        router.refresh();
                        toast.success(t("category.duplicated"));
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

          <CollapsibleContent>
            <div
              className="mx-4 mb-4 h-px"
              style={{ backgroundColor: category.color + "30" }}
            />
            <SortableContext
              items={category.groups.map((g) => g.id)}
              strategy={
                boardColumns > 1
                  ? rectSortingStrategy
                  : verticalListSortingStrategy
              }>
              <div
                className={[
                  boardColumns > 1
                    ? "grid gap-4 px-4 pb-4"
                    : "space-y-4 px-4 pb-4",
                  isEditing
                    ? "bg-edit-grid rounded-b-lg border-t border-dashed border-border/40 pt-4"
                    : "",
                ].join(" ")}
                style={
                  boardColumns > 1
                    ? {
                        gridTemplateColumns: `repeat(${boardColumns}, minmax(0, 1fr))`,
                        gridAutoRows: "minmax(0, auto)",
                      }
                    : undefined
                }>
                {category.groups.map((group) => (
                  <SortableGroup
                    key={group.id}
                    group={group}
                    categoryId={category.id}
                    boardColumns={boardColumns}
                  />
                ))}
                {category.groups.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    {t("category.noGroups")}
                  </p>
                )}
              </div>
            </SortableContext>

            {isEditing && !isDragOverlay && (
              <div className="flex items-center gap-2 px-4 pb-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddGroupOpen(true)}>
                  <Plus className="mr-1 size-3.5" />
                  {t("category.addGroup")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddTileOpen(true)}
                  disabled={category.groups.length === 0}>
                  <Plus className="mr-1 size-3.5" />
                  {t("category.addTile")}
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AddGroupDialog
        categories={[category]}
        defaultCategoryId={category.id}
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
      />
      <AddTileDialog
        categories={[category]}
        open={addTileOpen}
        onOpenChange={setAddTileOpen}
      />
    </>
  );
}
