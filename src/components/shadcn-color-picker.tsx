"use client";

import { Check, Ban } from "lucide-react";
import { SHADCN_SURFACES } from "@/lib/shadcn-palette";
import { cn } from "@/lib/utils";

export function ShadcnColorPicker({
  value,
  onChange,
  allowNone = true,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  allowNone?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex size-7 items-center justify-center rounded-md border bg-background transition-all hover:scale-110",
            value == null && "ring-2 ring-ring ring-offset-1",
          )}
          title="None"
          aria-label="None">
          <Ban className="size-3.5 text-muted-foreground" />
        </button>
      )}
      {SHADCN_SURFACES.map((s) => {
        const selected = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md border transition-all hover:scale-110",
              selected && "ring-2 ring-ring ring-offset-1",
            )}
            style={{ backgroundColor: s.light }}
            title={s.label}
            aria-label={s.label}>
            {selected && <Check className="size-3.5 text-foreground/70" />}
          </button>
        );
      })}
    </div>
  );
}
