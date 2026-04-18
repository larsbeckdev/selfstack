"use client";

import { useState } from "react";
import { updateTile } from "@/lib/actions/board";
import type { Tile } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { IconPicker } from "@/components/icon-picker";
import { toast } from "sonner";

function ColorInput({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-10 cursor-pointer rounded border disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-8 flex-1 text-xs"
        />
      </div>
    </div>
  );
}

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
  const [bgColor, setBgColor] = useState(tile.bgColor ?? "");
  const [borderColor, setBorderColor] = useState(tile.borderColor ?? "");
  const [borderMatchesBg, setBorderMatchesBg] = useState(tile.borderMatchesBg);
  const [url, setUrl] = useState(tile.url ?? "");
  const [description, setDescription] = useState(tile.description ?? "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateTile(tile.id, {
        name,
        icon,
        iconUrl,
        color,
        bgColor: bgColor || undefined,
        borderColor: borderMatchesBg
          ? bgColor || undefined
          : borderColor || undefined,
        borderMatchesBg,
        url: url || undefined,
        description: description || undefined,
      });
      toast.success("Kachel aktualisiert");
      onOpenChange(false);
    } catch {
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kachel bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-tile-name">Name</Label>
            <Input
              id="edit-tile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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

          {/* Colors */}
          <div className="space-y-3">
            <Label>Farben</Label>
            <div className="grid grid-cols-2 gap-3">
              <ColorInput
                id="edit-tile-color"
                label="Icon"
                value={color}
                onChange={setColor}
              />
              <ColorInput
                id="edit-tile-bg"
                label="Hintergrund"
                value={bgColor || color + "18"}
                onChange={(v) => setBgColor(v)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-border-match"
                checked={borderMatchesBg}
                onCheckedChange={(checked) => {
                  setBorderMatchesBg(checked);
                  if (checked && bgColor) setBorderColor(bgColor);
                }}
              />
              <Label htmlFor="edit-border-match" className="text-xs">
                Rahmen = Hintergrund
              </Label>
            </div>
            <ColorInput
              id="edit-tile-border"
              label="Rahmen"
              value={
                borderMatchesBg
                  ? bgColor || color + "40"
                  : borderColor || color + "40"
              }
              onChange={(v) => setBorderColor(v)}
              disabled={borderMatchesBg}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tile-url">URL (optional)</Label>
            <Input
              id="edit-tile-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tile-desc">Beschreibung (optional)</Label>
            <Textarea
              id="edit-tile-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
