"use client";

import { useState, useEffect } from "react";
import { Plus, Lock, Unlock, Settings } from "lucide-react";
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
import { useTranslation } from "@/components/locale-provider";
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
  const { t } = useTranslation();

  // Auto-open settings when ?settings=true is in the URL
  useEffect(() => {
    if (searchParams.get("settings") === "true") {
      setSettingsOpen(true);
      router.replace(`/board/${board.slug}`, { scroll: false });
    }
  }, [searchParams, board.slug, router]);

  const canEdit = boardRole === "owner" || boardRole === "editor";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{board.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {board.categories.length} {t("public.categories")}
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
              <p>{t("board.settings")}</p>
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
                    {isEditing ? t("common.edit") : t("common.locked")}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isEditing
                    ? t("board.editModeActive")
                    : t("board.editModeLocked")}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {isEditing && canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="sm:mr-2 size-4" />
                  <span className="hidden sm:inline">{t("common.add")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddCategoryOpen(true)}>
                  {t("board.addCategory")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setAddGroupOpen(true)}
                  disabled={board.categories.length === 0}>
                  {t("board.addGroup")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setAddTileOpen(true)}
                  disabled={
                    board.categories.flatMap((c) => c.groups).length === 0
                  }>
                  {t("board.addTile")}
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
