"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTile } from "@/lib/actions/board";
import type { Tile } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoHint } from "@/components/ui/info-hint";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { ColorPicker } from "@/components/ui/color-picker";
import { ColorFields } from "@/components/ui/color-fields";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function EditTileDialog({
  tile,
  open,
  onOpenChange,
}: {
  tile: Tile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(tile.name);
  const [icon, setIcon] = useState(tile.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(tile.iconUrl ?? null);
  const [color, setColor] = useState(tile.color);
  const [bgColor, setBgColor] = useState<string | null>(tile.bgColor ?? null);
  const [borderColor, setBorderColor] = useState<string | null>(
    tile.borderColor ?? null,
  );
  const [borderMatchesBg, setBorderMatchesBg] = useState(tile.borderMatchesBg);
  const [url, setUrl] = useState(tile.url ?? "");
  const [description, setDescription] = useState(tile.description ?? "");
  const [statusCheck, setStatusCheck] = useState(tile.statusCheck);
  const [size, setSize] = useState<"small" | "default" | "large">(
    (tile.size as "small" | "default" | "large") ?? "default",
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTile(tile.id, {
        name,
        icon,
        iconUrl,
        color,
        bgColor: bgColor ?? null,
        borderColor: borderMatchesBg
          ? (bgColor ?? null)
          : (borderColor ?? null),
        borderMatchesBg,
        url: url || undefined,
        description: description || undefined,
        statusCheck,
        size,
      });
      toast.success(t("tile.updated"));
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
          <DialogTitle>{t("tile.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="edit-tile-name">{t("common.name")}</Label>
              <InfoHint>{t("validation.nameRule")}</InfoHint>
            </div>
            <Input
              id="edit-tile-name"
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

          {/* Colors */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-tile-color">{t("tile.colorIcon")}</Label>
              <ColorPicker
                value={color}
                onChange={(v) => setColor(v ?? "#000000")}
                allowNone={false}
                label={t("tile.colorIcon")}
              />
            </div>
            <ColorFields
              bgColor={bgColor}
              setBgColor={setBgColor}
              borderColor={borderColor}
              setBorderColor={setBorderColor}
              borderMatchesBg={borderMatchesBg}
              setBorderMatchesBg={setBorderMatchesBg}
              idPrefix="edit-tile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tile-url">{t("tile.urlOptional")}</Label>
            <Input
              id="edit-tile-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="edit-tile-status"
              checked={statusCheck}
              onCheckedChange={setStatusCheck}
              disabled={!url}
            />
            <Label htmlFor="edit-tile-status" className="text-xs">
              {t("tile.statusCheck")}
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tile-desc">
              {t("tile.descriptionOptional")}
            </Label>
            <Textarea
              id="edit-tile-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("tile.size")}</Label>
            <Select
              value={size}
              onValueChange={(v) => setSize(v as typeof size)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{t("tile.sizeSmall")}</SelectItem>
                <SelectItem value="default">{t("tile.sizeDefault")}</SelectItem>
                <SelectItem value="large">{t("tile.sizeLarge")}</SelectItem>
              </SelectContent>
            </Select>
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
