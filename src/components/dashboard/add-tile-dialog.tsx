"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTile } from "@/lib/actions/board";
import type { CategoryWithGroups } from "@/types";
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

export function AddTileDialog({
  categories,
  defaultGroupId,
  open,
  onOpenChange,
}: {
  categories: CategoryWithGroups[];
  defaultGroupId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const allGroups = categories.flatMap((c) =>
    c.groups.map((g) => ({ ...g, categoryName: c.name })),
  );
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("square");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [color, setColor] = useState("#6366f1");
  const [bgColor, setBgColor] = useState<string | null>(null);
  const [borderColor, setBorderColor] = useState<string | null>(null);
  const [borderMatchesBg, setBorderMatchesBg] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [statusCheck, setStatusCheck] = useState(false);
  const [size, setSize] = useState<"small" | "default" | "large">("default");
  const [groupId, setGroupId] = useState(
    defaultGroupId ?? allGroups[0]?.id ?? "",
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // Keep groupId in sync when the caller opens the dialog with a fresh default.
  const [prevDefault, setPrevDefault] = useState(defaultGroupId);
  if (defaultGroupId !== prevDefault) {
    setPrevDefault(defaultGroupId);
    if (defaultGroupId) setGroupId(defaultGroupId);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !groupId) return;

    setLoading(true);
    try {
      await createTile({
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
        groupId,
      });
      toast.success(t("tile.created"));
      router.refresh();
      onOpenChange(false);
      setName("");
      setIcon("square");
      setIconUrl(null);
      setColor("#6366f1");
      setBgColor(null);
      setBorderColor(null);
      setBorderMatchesBg(false);
      setUrl("");
      setDescription("");
      setStatusCheck(false);
      setSize("default");
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
          <DialogTitle>{t("tile.create")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="tile-name">{t("common.name")}</Label>
              <InfoHint>{t("validation.nameRule")}</InfoHint>
            </div>
            <Input
              id="tile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("tile.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("tile.group")}</Label>
            <Select
              value={groupId}
              onValueChange={setGroupId}
              disabled={!!defaultGroupId}>
              <SelectTrigger>
                <SelectValue placeholder={t("tile.groupSelect")} />
              </SelectTrigger>
              <SelectContent>
                {allGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.categoryName} → {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label htmlFor="tile-color">{t("tile.colorIcon")}</Label>
              <ColorPicker
                value={color}
                onChange={(v) => setColor(v ?? "#6366f1")}
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
              idPrefix="tile"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tile-url">{t("tile.urlOptional")}</Label>
            <Input
              id="tile-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="tile-status"
              checked={statusCheck}
              onCheckedChange={setStatusCheck}
              disabled={!url}
            />
            <Label htmlFor="tile-status" className="text-xs">
              {t("tile.statusCheck")}
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tile-desc">{t("tile.descriptionOptional")}</Label>
            <Textarea
              id="tile-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("tile.descriptionPlaceholder")}
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
              {loading ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
