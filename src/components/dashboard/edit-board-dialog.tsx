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
import { useTranslation } from "@/components/locale-provider";
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
  const { t } = useTranslation();
  const [name, setName] = useState(board.name);
  const [slug, setSlug] = useState(board.slug);
  const [icon, setIcon] = useState(board.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(board.iconUrl ?? null);
  const [saving, setSaving] = useState(false);

  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slugValid) return;
    setSaving(true);
    try {
      const updated = await updateBoard(board.id, {
        name,
        slug,
        icon,
        iconUrl,
      });
      toast.success(t("board.updated"));
      router.refresh();
      onOpenChange(false);
      if (updated.slug !== board.slug) {
        router.replace(`/board/${updated.slug}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Slug already in use"
          ? t("board.slugInUse")
          : t("error.updateFailed");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("board.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-board-name">{t("common.name")}</Label>
            <Input
              id="edit-board-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (slug === slugify(board.name)) {
                  setSlug(slugify(e.target.value));
                }
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-board-slug">{t("board.slug")}</Label>
            <Input
              id="edit-board-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            {!slugValid && slug.length > 0 && (
              <p className="text-xs text-destructive">
                {t("board.slugInvalid")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("tile.icon")}</Label>
            <IconPicker
              value={icon}
              onChange={setIcon}
              iconUrl={iconUrl}
              onIconUrlChange={setIconUrl}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !slugValid}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
