"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBoard } from "@/lib/actions/board";
import type { Board } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { toast } from "sonner";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function EditBoardDialog({
  board,
  open,
  onOpenChange,
}: {
  board: Board;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(board.name);
  const [slug, setSlug] = useState(board.slug);
  const [icon, setIcon] = useState(board.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(board.iconUrl ?? null);
  const [loading, setLoading] = useState(false);

  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slugValid) return;

    setLoading(true);
    try {
      const updated = await updateBoard(board.id, { name, slug, icon, iconUrl });
      toast.success("Board aktualisiert");
      onOpenChange(false);
      if (updated.slug !== board.slug) {
        router.replace(`/board/${updated.slug}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Slug already in use"
          ? "Dieser Link wird bereits verwendet"
          : "Fehler beim Aktualisieren";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Board bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-board-name">Name</Label>
            <Input
              id="edit-board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-board-slug">Link / URL</Label>
            <div className="flex items-center gap-0">
              <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs text-muted-foreground whitespace-nowrap">
                /board/
              </span>
              <Input
                id="edit-board-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="rounded-l-none"
                required
              />
            </div>
            {slug && !slugValid && (
              <p className="text-xs text-destructive">
                Nur Kleinbuchstaben, Zahlen und Bindestriche
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <IconPicker
              value={icon}
              onChange={setIcon}
              iconUrl={iconUrl}
              onIconUrlChange={setIconUrl}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || !slugValid}>
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
