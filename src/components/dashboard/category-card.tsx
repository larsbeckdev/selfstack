"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Trash2,
  Copy as CopyIcon,
  MoreHorizontal,
  Plus,
  GripVertical,
  Check,
  Columns2,
} from "lucide-react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { CategoryWithGroups } from "@/types";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableGroup } from "./sortable-group";
import { EditCategoryDialog } from "./edit-category-dialog";
import { useEditMode } from "./edit-mode-context";
import {
  deleteCategory,
  duplicateCategory,
  setCategoryWidth,
} from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CATEGORY_WIDTHS,
  getCategoryWidth,
  type CategoryWidth,
} from "@/lib/grid";

const WIDTH_LABELS: Record<CategoryWidth, string> = {
  1: "1/4",
  2: "2/4",
  3: "3/4",
  4: "4/4",
};

export function CategoryCard({
  category,
  allGroups,
  onAddGroup,
  onAddTile,
  dragHandleProps,
}: {
  category: CategoryWithGroups;
  allGroups: { id: string; name: string; categoryName: string }[];
  onAddGroup: (categoryId: string) => void;
  onAddTile: (groupId: string) => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const isEditing = useEditMode();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const width = getCategoryWidth(category.w);

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

  const handleWidth = async (w: CategoryWidth) => {
    if (w === width) return;
    try {
      await setCategoryWidth(category.id, w);
      router.refresh();
    } catch {
      toast.error(t("error.updateFailed"));
    }
  };

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        {/* colored top accent */}
        <div
          className="h-1 w-full shrink-0"
          style={{ backgroundColor: category.color }}
          aria-hidden
        />

        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {isEditing && (
            <button
              type="button"
              {...(dragHandleProps ?? {})}
              className="-ml-1 flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing touch-none"
              title={t("common.drag")}>
              <GripVertical className="size-4" />
            </button>
          )}
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
                    title={t("common.moreActions")}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 size-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Columns2 className="mr-2 size-4" />
                      {t("category.width")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {CATEGORY_WIDTHS.map((w) => (
                        <DropdownMenuItem
                          key={w}
                          onClick={() => handleWidth(w)}>
                          {w === width ? (
                            <Check className="mr-2 size-4" />
                          ) : (
                            <span className="mr-2 size-4" />
                          )}
                          {WIDTH_LABELS[w]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
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

        {/* body: stacked groups */}
        <div className="flex-1 space-y-3 px-3 pb-3">
          <SortableContext
            items={category.groups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}>
            {category.groups.map((group) => (
              <SortableGroup
                key={group.id}
                group={group}
                categoryId={category.id}
                allGroups={allGroups}
                onAddTile={onAddTile}
              />
            ))}
          </SortableContext>

          {category.groups.length === 0 &&
            (isEditing ? (
              <button
                type="button"
                onClick={() => onAddGroup(category.id)}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-8 text-sm text-muted-foreground transition-colors",
                  "hover:border-primary/60 hover:bg-primary/5 hover:text-primary",
                )}>
                <Plus className="size-4" />
                {t("group.addTo")}
              </button>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground/60">
                {t("group.emptyHint")}
              </div>
            ))}
        </div>
      </div>
      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
