"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
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
import { useEditMode } from "./edit-mode-context";
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
  const isEditing = useEditMode();

  const handleDelete = async () => {
    try {
      await deleteCategory(category.id);
      toast.success("Kategorie gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
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
              {category.groups.length} Gruppen
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
                    Bearbeiten
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await duplicateCategory(category.id);
                        toast.success("Kategorie dupliziert");
                      } catch {
                        toast.error("Fehler beim Duplizieren");
                      }
                    }}>
                    <Copy className="mr-2 size-3.5" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive">
                    <Trash2 className="mr-2 size-3.5" />
                    Löschen
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
              strategy={verticalListSortingStrategy}>
              <div className="space-y-4 px-4 pb-4">
                {category.groups.map((group) => (
                  <SortableGroup
                    key={group.id}
                    group={group}
                    categoryId={category.id}
                  />
                ))}
                {category.groups.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Noch keine Gruppen in dieser Kategorie
                  </p>
                )}
              </div>
            </SortableContext>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <EditCategoryDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
