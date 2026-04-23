"use client";

import { useState } from "react";
import { Globe, Lock, Trash2, Copy, Pencil, ArrowUp, ArrowDown } from "lucide-react";
import type { Board } from "@/generated/prisma/client";
import { updateBoard, deleteBoard, reorderBoards } from "@/lib/actions/board";
import { getAppUrl } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DynamicIcon } from "@/components/dynamic-icon";
import { EditBoardDialog } from "@/components/dashboard/edit-board-dialog";
import { useTranslation } from "@/components/locale-provider";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export function BoardSettings({ boards }: { boards: Board[] }) {
  const { t } = useTranslation();
  const [items, setItems] = useState(boards);

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await reorderBoards(next.map((b) => b.id));
    } catch {
      setItems(items); // revert
      toast.error(t("error.updateFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("board.settings")}</CardTitle>
          <CardDescription>{t("settings.boardsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dashboard.noBoardsTitle")}
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((board, i) => (
                <BoardSettingsRow
                  key={board.id}
                  board={board}
                  canMoveUp={i > 0}
                  canMoveDown={i < items.length - 1}
                  onMoveUp={() => move(i, -1)}
                  onMoveDown={() => move(i, 1)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BoardSettingsRow({
  board,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  board: Board;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { t } = useTranslation();

  const toggleVisibility = async (checked: boolean) => {
    setLoading(true);
    try {
      await updateBoard(board.id, { isPublic: checked });
      setIsPublic(checked);
      toast.success(
        checked ? t("board.publicEnabled") : t("board.publicDisabled"),
      );
    } catch {
      toast.error(t("error.changeFailed"));
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = async () => {
    let origin = "";
    try {
      origin = await getAppUrl();
    } catch {
      origin = typeof window !== "undefined" ? window.location.origin : "";
    }
    const url = `${origin}/board/${board.slug}`;
    const ok = await copyToClipboard(url);
    if (ok) toast.success(t("common.linkCopied"));
    else toast.error(t("common.copyFailed"));
  };

  const handleDelete = async () => {
    try {
      await deleteBoard(board.id);
      toast.success(t("board.deleted"));
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <DynamicIcon
            name={board.icon}
            iconUrl={board.iconUrl}
            className="size-4"
          />
        </div>
        <div>
          <p className="text-sm font-medium">{board.name}</p>
          <p className="text-xs text-muted-foreground">
            {isPublic ? t("common.public") : t("common.private")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("common.edit")}</TooltipContent>
        </Tooltip>

        {isPublic && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={copyPublicLink}>
                <Copy className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("common.copy")} {t("common.link").toLowerCase()}
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Label htmlFor={`public-${board.id}`} className="sr-only">
                {t("common.public")}
              </Label>
              {isPublic ? (
                <Globe className="size-4 text-primary" />
              ) : (
                <Lock className="size-4 text-muted-foreground" />
              )}
              <Switch
                id={`public-${board.id}`}
                checked={isPublic}
                onCheckedChange={toggleVisibility}
                disabled={loading}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isPublic ? t("common.public") : t("common.private")}
          </TooltipContent>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("common.delete")}</TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("board.deleteConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("board.deleteSectionDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <EditBoardDialog
        board={board}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
