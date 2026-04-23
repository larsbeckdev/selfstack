"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/actions/board";
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

export function AddCategoryDialog({
  boardId,
  open,
  onOpenChange,
}: {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("folder");
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [borderColor, setBorderColor] = useState<string | null>(null);
  const [borderMatchesBg, setBorderMatchesBg] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createCategory({
        name,
        icon,
        bgColor,
        borderColor: borderMatchesBg ? bgColor : borderColor,
        borderMatchesBg,
        boardId,
      });
      toast.success(t("category.created"));
      router.refresh();
      onOpenChange(false);
      setName("");
      setIcon("folder");
      setBgColor(null);
      setBorderColor(null);
      setBorderMatchesBg(false);
    } catch {
      toast.error(t("error.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("category.create")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">{t("common.name")}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("category.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("tile.icon")}</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <ColorFields
            bgColor={bgColor}
            setBgColor={setBgColor}
            borderColor={borderColor}
            setBorderColor={setBorderColor}
            borderMatchesBg={borderMatchesBg}
            setBorderMatchesBg={setBorderMatchesBg}
            idPrefix="cat"
          />
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
