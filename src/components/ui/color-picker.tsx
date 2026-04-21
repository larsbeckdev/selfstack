"use client";

import * as React from "react";
import { Check, Ban, Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SHADCN_SURFACES } from "@/lib/shadcn-palette";
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
  /** Disable hex input (palette only). Defaults to false. */
  paletteOnly?: boolean;
};

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Unified color picker: palette grid + native color input + hex text field.
 * Always stores/returns hex strings (e.g. `#f1f5f9`) or `null`.
 */
export function ColorPicker({
  value,
  onChange,
  allowNone = true,
  label,
  size = "md",
  className,
  paletteOnly = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [hexDraft, setHexDraft] = React.useState(value ?? "");

  React.useEffect(() => {
    setHexDraft(value ?? "");
  }, [value]);

  const swatchSize = size === "sm" ? "size-7" : "size-9";

  const commitHex = (raw: string) => {
    const v = raw.trim();
    if (v === "") {
      if (allowNone) onChange(null);
      return;
    }
    const prefixed = v.startsWith("#") ? v : `#${v}`;
    if (HEX_REGEX.test(prefixed)) onChange(prefixed.toLowerCase());
  };

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
      <PopoverContent align="start" className="w-64 space-y-3 p-3">
        <div className="grid grid-cols-8 gap-1.5">
          {allowNone && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "flex size-6 items-center justify-center rounded-md border bg-background transition-all hover:scale-110",
                value == null && "ring-2 ring-ring ring-offset-1",
              )}
              title="None"
              aria-label="None">
              <Ban className="size-3 text-muted-foreground" />
            </button>
          )}
          {SHADCN_SURFACES.map((s) => {
            const selected = value?.toLowerCase() === s.light.toLowerCase();
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.light);
                  setOpen(false);
                }}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md border transition-all hover:scale-110",
                  selected && "ring-2 ring-ring ring-offset-1",
                )}
                style={{ backgroundColor: s.light }}
                title={s.label}
                aria-label={s.label}>
                {selected && <Check className="size-3 text-foreground/70" />}
              </button>
            );
          })}
        </div>
        {!paletteOnly && (
          <div className="flex items-center gap-2">
            <label className="relative inline-flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-md border">
              <Pipette className="size-3.5 text-muted-foreground" />
              <input
                type="color"
                value={value && HEX_REGEX.test(value) ? value : "#888888"}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Native color picker"
              />
            </label>
            <Input
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={() => commitHex(hexDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitHex(hexDraft);
                  setOpen(false);
                }
              }}
              placeholder="#rrggbb"
              className="h-8 flex-1 font-mono text-xs"
            />
            {allowNone && value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}>
                Clear
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
