"use client";

import { useState } from "react";
import { Globe, Lock, Trash2, Copy, Pencil } from "lucide-react";
import type { Board } from "@/generated/prisma/client";
import { updateBoard, deleteBoard } from "@/lib/actions/board";
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
import { toast } from "sonner";

export function BoardSettings({ boards }: { boards: Board[] }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Board-Einstellungen</CardTitle>
          <CardDescription>
            Verwalte die Sichtbarkeit deiner Boards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {boards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Boards vorhanden
            </p>
          ) : (
            <div className="space-y-4">
              {boards.map((board) => (
                <BoardSettingsRow key={board.id} board={board} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BoardSettingsRow({ board }: { board: Board }) {
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const toggleVisibility = async (checked: boolean) => {
    setLoading(true);
    try {
      await updateBoard(board.id, { isPublic: checked });
      setIsPublic(checked);
      toast.success(
        checked ? "Board ist jetzt öffentlich" : "Board ist jetzt privat",
      );
    } catch {
      toast.error("Fehler beim Ändern");
    } finally {
      setLoading(false);
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/b/${board.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link kopiert");
  };

  const handleDelete = async () => {
    try {
      await deleteBoard(board.id);
      toast.success("Board gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
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
            {isPublic ? "Öffentlich" : "Privat"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
        </Button>

        {isPublic && (
          <Button variant="ghost" size="icon" onClick={copyPublicLink}>
            <Copy className="size-4" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Label htmlFor={`public-${board.id}`} className="sr-only">
            Öffentlich
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Board löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Alle Kategorien, Gruppen und Kacheln in diesem Board werden
                ebenfalls gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Löschen
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
