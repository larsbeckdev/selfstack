"use client";

import * as React from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPickerPanel } from "@/components/ui/color-picker-panel";
import { useTranslation } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  /**
   * When `false`, the picker still opens, but the "Keine Farbe" clear button
   * is hidden. Defaults to `true` — nearly all fields in the app allow
   * clearing to fall back to the theme default.
   */
  allowNone?: boolean;
  /** Optional trigger label for aria. */
  label?: string;
  /** Size of the trigger. */
  size?: "sm" | "md";
  /** Disable the trigger (e.g., when "border = bg" is on). */
  disabled?: boolean;
  className?: string;
};

/**
 * Unified color picker: pill trigger (swatch + hex / "Keine Farbe") opens a
 * popover with the Figma-style ColorPickerPanel (SV plane, hue + alpha
 * sliders, swatches, eyedropper, hex/rgb/hsl input). Stores hex strings or
 * `null`.
 */
export function ColorPicker({
  value,
  onChange,
  allowNone = true,
  label,
  size = "md",
  disabled = false,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();
  const pad =
    size === "sm" ? "h-8 pl-1.5 pr-2 text-xs" : "h-9 pl-2 pr-3 text-sm";
  const swatchSize = size === "sm" ? "size-5" : "size-6";

  const displayText = value ? value.toUpperCase() : t("colorPicker.none");

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label ?? "Pick color"}
          className={cn(
            "relative inline-flex items-center gap-2 rounded-md border border-input bg-background font-mono tracking-tight transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50",
            pad,
            className,
          )}>
          <span
            className={cn(
              "shrink-0 rounded border border-border/60",
              swatchSize,
            )}
            style={
              value
                ? { backgroundColor: value }
                : {
                    backgroundImage:
                      "linear-gradient(45deg, #d4d4d8 25%, transparent 25%), linear-gradient(-45deg, #d4d4d8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d4d4d8 75%), linear-gradient(-45deg, transparent 75%, #d4d4d8 75%)",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                  }
            }
          />
          {value ? (
            <span className="truncate">{displayText}</span>
          ) : (
            <span className="inline-flex items-center gap-1 truncate text-muted-foreground">
              <Ban className="size-3.5" />
              {displayText}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        // The native EyeDropper overlay steals focus; prevent Radix from
        // closing the popover when that happens.
        onFocusOutside={(e) => e.preventDefault()}>
        <ColorPickerPanel
          value={value ?? "#7c3aed"}
          onChange={(v) => onChange(v)}
        />
        {allowNone && (
          <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}>
              <Ban className="mr-1.5 size-3.5" />
              {t("colorPicker.none")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
