"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "@/lib/actions/board";
import type { CategoryWithGroups } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPicker } from "@/components/icon-picker";
import { ColorFields } from "@/components/ui/color-fields";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function AddGroupDialog({
  categories,
  defaultCategoryId,
  open,
  onOpenChange,
}: {
  categories: CategoryWithGroups[];
  defaultCategoryId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("grid-3x3");
  const [categoryId, setCategoryId] = useState(
    defaultCategoryId ?? categories[0]?.id ?? "",
  );
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [borderColor, setBorderColor] = useState<string | null>(null);
  const [borderMatchesBg, setBorderMatchesBg] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const [prevDefault, setPrevDefault] = useState(defaultCategoryId);
  if (defaultCategoryId !== prevDefault) {
    setPrevDefault(defaultCategoryId);
    if (defaultCategoryId) setCategoryId(defaultCategoryId);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    setLoading(true);
    try {
      await createGroup({
        name,
        icon,
        categoryId,
        bgColor,
        borderColor: borderMatchesBg ? bgColor : borderColor,
        borderMatchesBg,
      });
      toast.success(t("group.created"));
      router.refresh();
      onOpenChange(false);
      setName("");
      setIcon("grid-3x3");
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
          <DialogTitle>{t("group.create")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grp-name">{t("common.name")}</Label>
            <Input
              id="grp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("group.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("board.addCategory")}</Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={!!defaultCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t("group.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            idPrefix="grp"
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
