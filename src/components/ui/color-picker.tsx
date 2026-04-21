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
import { cn } from "@/lib/utils";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  /** Whether the picker allows clearing the color. */
  allowNone?: boolean;
  /** Optional trigger label for aria. */
  label?: string;
  /** Size of the trigger swatch. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Unified color picker: swatch trigger opens a popover with the full
 * Figma-style ColorPickerPanel (SV plane, hue + alpha sliders, swatches,
 * eyedropper, hex/rgb/hsl input). Stores/returns hex strings or `null`.
 */
export function ColorPicker({
  value,
  onChange,
  allowNone = true,
  label,
  size = "md",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const swatchSize = size === "sm" ? "size-7" : "size-9";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label ?? "Pick color"}
          className={cn(
            "relative inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-background transition-all hover:scale-105",
            swatchSize,
            className,
          )}
          style={value ? { backgroundColor: value } : undefined}>
          {!value && <Ban className="size-3.5 text-muted-foreground" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
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
              Keine Farbe
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
