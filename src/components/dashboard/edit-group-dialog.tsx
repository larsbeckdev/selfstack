"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateGroup } from "@/lib/actions/board";
import type { Group } from "@/generated/prisma/client";
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

export function EditGroupDialog({
  group,
  open,
  onOpenChange,
}: {
  group: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(group.name);
  const [icon, setIcon] = useState(group.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(group.iconUrl ?? null);
  const [bgColor, setBgColor] = useState<string | null>(group.bgColor ?? null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateGroup(group.id, { name, icon, iconUrl, bgColor });
      toast.success(t("group.updated"));
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
          <DialogTitle>{t("group.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-grp-name">{t("common.name")}</Label>
            <Input
              id="edit-grp-name"
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
            <Label>{t("group.bgColor")}</Label>
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
