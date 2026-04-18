"use client";

import { useState } from "react";
import { Plus, Pencil, Lock, Unlock, Copy } from "lucide-react";
import type { BoardWithContents } from "@/types";
import { duplicateBoard } from "@/lib/actions/board";
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
import { BoardDndContext } from "@/components/dashboard/board-dnd-context";
import { EditModeProvider } from "@/components/dashboard/edit-mode-context";
import { AddCategoryDialog } from "@/components/dashboard/add-category-dialog";
import { AddGroupDialog } from "@/components/dashboard/add-group-dialog";
import { AddTileDialog } from "@/components/dashboard/add-tile-dialog";
import { EditBoardDialog } from "@/components/dashboard/edit-board-dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function BoardView({ board }: { board: BoardWithContents }) {
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addTileOpen, setAddTileOpen] = useState(false);
  const [editBoardOpen, setEditBoardOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const handleDuplicateBoard = async () => {
    try {
      const copy = await duplicateBoard(board.id);
      toast.success("Board dupliziert");
      router.push(`/board/${copy.slug}`);
    } catch {
      toast.error("Fehler beim Duplizieren");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setEditBoardOpen(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={handleDuplicateBoard}>
                  <Copy className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Board duplizieren</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            {board.categories.length} Kategorien
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? (
                  <Unlock className="sm:mr-2 size-3.5" />
                ) : (
                  <Lock className="sm:mr-2 size-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isEditing ? "Bearbeiten" : "Gesperrt"}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isEditing
                  ? "Bearbeitungsmodus aktiv – Klicke zum Sperren"
                  : "Gesperrt – Klicke zum Bearbeiten"}
              </p>
            </TooltipContent>
          </Tooltip>

          {isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="sm:mr-2 size-4" />
                  <span className="hidden sm:inline">Hinzufügen</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddCategoryOpen(true)}>
                  Kategorie
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setAddGroupOpen(true)}
                  disabled={board.categories.length === 0}>
                  Gruppe
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setAddTileOpen(true)}
                  disabled={
                    board.categories.flatMap((c) => c.groups).length === 0
                  }>
                  Kachel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <EditModeProvider isEditing={isEditing}>
        <BoardDndContext board={board} />
      </EditModeProvider>

      <AddCategoryDialog
        boardId={board.id}
        open={addCategoryOpen}
        onOpenChange={setAddCategoryOpen}
      />
      <AddGroupDialog
        categories={board.categories}
        open={addGroupOpen}
        onOpenChange={setAddGroupOpen}
      />
      <AddTileDialog
        categories={board.categories}
        open={addTileOpen}
        onOpenChange={setAddTileOpen}
      />
      <EditBoardDialog
        board={board}
        open={editBoardOpen}
        onOpenChange={setEditBoardOpen}
      />
    </div>
  );
}
