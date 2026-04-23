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
import { ColorFields } from "@/components/ui/color-fields";
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
  const [bgColor, setBgColor] = useState<string | null>(
    category.bgColor ?? null,
  );
  const [borderColor, setBorderColor] = useState<string | null>(
    category.borderColor ?? null,
  );
  const [borderMatchesBg, setBorderMatchesBg] = useState(
    category.borderMatchesBg,
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
        bgColor,
        borderColor: borderMatchesBg ? bgColor : borderColor,
        borderMatchesBg,
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
          <ColorFields
            bgColor={bgColor}
            setBgColor={setBgColor}
            borderColor={borderColor}
            setBorderColor={setBorderColor}
            borderMatchesBg={borderMatchesBg}
            setBorderMatchesBg={setBorderMatchesBg}
            idPrefix="edit-cat"
          />
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
