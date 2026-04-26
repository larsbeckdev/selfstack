"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteBoard } from "@/lib/actions/board";
import { Button } from "@/components/ui/button";
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
import { useTranslation } from "@/components/locale-provider";

export function DeleteBoardButton({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          aria-label={t("common.delete")}
          onClick={(e) => e.stopPropagation()}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dashboard.deleteBoardTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("dashboard.deleteBoardDesc").replace("{name}", boardName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                try {
                  await deleteBoard(boardId);
                  toast.success(t("dashboard.deleteBoardSuccess"));
                  setOpen(false);
                  router.refresh();
                } catch (err) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : t("common.errorGeneric"),
                  );
                }
              });
            }}>
            {pending ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
