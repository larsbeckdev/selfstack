"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCategory } from "@/lib/actions/board";
import type { Category } from "@/generated/prisma/client";
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
import { ColorPicker } from "@/components/ui/color-picker";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(
    category.iconUrl ?? null,
  );
  const [color, setColor] = useState(category.color);
  const [bgColor, setBgColor] = useState<string | null>(
    category.bgColor ?? null,
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCategory(category.id, {
        name,
        icon,
        iconUrl,
        color,
        bgColor,
      });
      toast.success(t("category.updated"));
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error(t("error.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("category.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-cat-name">{t("common.name")}</Label>
            <Input
              id="edit-cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
          <div className="space-y-2">
            <Label>{t("common.color")}</Label>
            <ColorPicker
              value={color}
              onChange={(v) => setColor(v ?? "#6366f1")}
              allowNone={false}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("category.bgColor")}</Label>
            <ColorPicker value={bgColor} onChange={setBgColor} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
