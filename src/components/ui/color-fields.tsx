"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import { useTranslation } from "@/components/locale-provider";

type Props = {
  bgColor: string | null;
  setBgColor: (value: string | null) => void;
  borderColor: string | null;
  setBorderColor: (value: string | null) => void;
  borderMatchesBg: boolean;
  setBorderMatchesBg: (value: boolean) => void;
  idPrefix: string;
};

/**
 * Consistent two-picker row: background + border color with a
 * "Rahmen = Hintergrund" toggle that disables the border picker and
 * keeps both values in sync.
 */
export function ColorFields({
  bgColor,
  setBgColor,
  borderColor,
  setBorderColor,
  borderMatchesBg,
  setBorderMatchesBg,
  idPrefix,
}: Props) {
  const { t } = useTranslation();
  const effectiveBorder = borderMatchesBg ? bgColor : borderColor;
  const hasAny = bgColor !== null || borderColor !== null || borderMatchesBg;

  const handleReset = () => {
    setBgColor(null);
    setBorderColor(null);
    setBorderMatchesBg(false);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-bg`} className="text-xs">
            {t("tile.colorBg")}
          </Label>
          <ColorPicker
            value={bgColor}
            onChange={(v) => {
              setBgColor(v);
              if (borderMatchesBg) setBorderColor(v);
            }}
            label={t("tile.colorBg")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-border`} className="text-xs">
            {t("tile.colorBorder")}
          </Label>
          <ColorPicker
            value={effectiveBorder}
            onChange={setBorderColor}
            disabled={borderMatchesBg}
            label={t("tile.colorBorder")}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id={`${idPrefix}-match`}
            checked={borderMatchesBg}
            onCheckedChange={(checked) => {
              setBorderMatchesBg(checked);
              if (checked) setBorderColor(bgColor);
            }}
          />
          <Label htmlFor={`${idPrefix}-match`} className="text-xs">
            {t("tile.borderMatchesBg")}
          </Label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={handleReset}
          disabled={!hasAny}>
          <RotateCcw className="mr-1 size-3" />
          {t("colorPicker.reset")}
        </Button>
      </div>
    </div>
  );
}
