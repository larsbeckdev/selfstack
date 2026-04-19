"use client";

import { useState, useEffect } from "react";
import { Plus, Lock, Unlock, Copy, Settings } from "lucide-react";
import type { BoardRole, BoardWithContents } from "@/types";
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
import { BoardSettingsDialog } from "@/components/dashboard/board-settings-dialog";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export function BoardView({
  board,
  boardRole = "owner",
}: {
  board: BoardWithContents;
  boardRole?: BoardRole;
}) {
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [addTileOpen, setAddTileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open settings when ?settings=true is in the URL
  useEffect(() => {
    if (searchParams.get("settings") === "true") {
      setSettingsOpen(true);
      router.replace(`/board/${board.slug}`, { scroll: false });
    }
  }, [searchParams, board.slug, router]);

  const canEdit = boardRole === "owner" || boardRole === "editor";

  const copyBoardLink = () => {
    const url = `${window.location.origin}/board/${board.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link kopiert");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
            {isEditing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={copyBoardLink}>
                    <Copy className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Link kopieren</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {board.categories.length} Kategorien
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Board Settings (gear icon) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}>
                <Settings className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Board-Einstellungen</p>
            </TooltipContent>
          </Tooltip>

          {canEdit && (
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
          )}

          {isEditing && canEdit && (
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
      <BoardSettingsDialog
        board={board}
        boardRole={boardRole}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
