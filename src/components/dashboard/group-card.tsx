"use client";

import { useState } from "react";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  LayoutGrid,
  Grid2x2,
  Grid3x3,
  List,
} from "lucide-react";
import type { GroupWithTiles, TileViewMode } from "@/types";
import { deleteGroup, updateGroup, duplicateGroup } from "@/lib/actions/board";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SortableTile } from "./sortable-tile";
import { EditGroupDialog } from "./edit-group-dialog";
import { useEditMode } from "./edit-mode-context";
import { toast } from "sonner";

const viewModeOptions: {
  value: TileViewMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "grid-sm", label: "Klein", icon: <Grid3x3 className="size-3.5" /> },
  { value: "grid", label: "Mittel", icon: <Grid2x2 className="size-3.5" /> },
  {
    value: "grid-lg",
    label: "Groß",
    icon: <LayoutGrid className="size-3.5" />,
  },
  { value: "list", label: "Liste", icon: <List className="size-3.5" /> },
];

export function GroupCard({
  group,
  dragHandleProps,
}: {
  group: GroupWithTiles;
  dragHandleProps?: Record<string, unknown>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const isEditing = useEditMode();
  const [currentViewMode, setCurrentViewMode] = useState<TileViewMode>(
    (group.viewMode as TileViewMode) || "grid",
  );
  const isListView = currentViewMode === "list";

  const handleDelete = async () => {
    try {
      await deleteGroup(group.id);
      toast.success("Gruppe gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const handleViewModeChange = async (mode: TileViewMode) => {
    setCurrentViewMode(mode);
    try {
      await updateGroup(group.id, { viewMode: mode });
    } catch {
      setCurrentViewMode((group.viewMode as TileViewMode) || "grid");
      toast.error("Fehler beim Ändern der Ansicht");
    }
  };

  return (
    <>
      <div className="rounded-md bg-muted/40">
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
            {group.tiles.length} Kacheln
          </span>

          <div className="flex items-center">
            {viewModeOptions.map((opt) => (
              <Tooltip key={opt.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground ${
                      currentViewMode === opt.value
                        ? "bg-background text-foreground shadow-sm"
                        : ""
                    }`}
                    onClick={() => handleViewModeChange(opt.value)}>
                    {opt.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{opt.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

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
                  Bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await duplicateGroup(group.id);
                      toast.success("Gruppe dupliziert");
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

        <SortableContext
          items={group.tiles.map((t) => t.id)}
          strategy={
            isListView
              ? verticalListSortingStrategy
              : horizontalListSortingStrategy
          }>
          <div
            className={
              isListView
                ? "flex flex-col gap-1 px-3 pb-3"
                : "flex flex-wrap gap-2 px-3 pb-3"
            }>
            {group.tiles.map((tile) => (
              <SortableTile
                key={tile.id}
                tile={tile}
                groupId={group.id}
                viewMode={currentViewMode}
              />
            ))}
            {group.tiles.length === 0 && (
              <p className="w-full py-2 text-center text-xs text-muted-foreground">
                Keine Kacheln
              </p>
            )}
          </div>
        </SortableContext>
      </div>

      <EditGroupDialog
        group={group}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
