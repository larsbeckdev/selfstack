"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGridMetrics } from "@/hooks/use-grid-metrics";
import type { GridBox } from "@/lib/grid";
import { gridItemStyle } from "@/lib/grid";

type Props = {
  box: GridBox;
  canvasCols: number;
  /** If false the element is statically positioned and no handles are shown. */
  enabled?: boolean;
  canResize?: boolean;
  minW?: number;
  minH?: number;
  onDragEnd?: (newBox: GridBox) => void;
  onResizeEnd?: (newBox: GridBox) => void;
  className?: string;
  children: React.ReactNode;
};

type Mode = "idle" | "drag" | "resize";

/**
 * Grid-positioned wrapper that renders a drag handle (top-left) and an
 * optional resize handle (bottom-right) while `enabled`. Uses pointer events
 * with setPointerCapture to track drag/resize deltas in px, converts to grid
 * units on release, clamps to the parent canvas, and reports the new box.
 */
export function DraggableItem({
  box,
  canvasCols,
  enabled = false,
  canResize = false,
  minW = 1,
  minH = 1,
  onDragEnd,
  onResizeEnd,
  className,
  children,
}: Props) {
  const { unit, gap } = useGridMetrics();
  const step = unit + gap;
  const [mode, setMode] = React.useState<Mode>("idle");
  const [delta, setDelta] = React.useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const startRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const beginDrag = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      setDelta({ x: 0, y: 0 });
      setMode("drag");
    },
    [enabled],
  );

  const beginResize = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      startRef.current = { x: e.clientX, y: e.clientY };
      setDelta({ x: 0, y: 0 });
      setMode("resize");
    },
    [enabled],
  );

  const handleMove = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (mode === "idle") return;
      setDelta({
        x: e.clientX - startRef.current.x,
        y: e.clientY - startRef.current.y,
      });
    },
    [mode],
  );

  const finish = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (mode === "idle") return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      const current = mode;
      setMode("idle");
      setDelta({ x: 0, y: 0 });
      if (current === "drag") {
        const stepsX = Math.round(dx / step);
        const stepsY = Math.round(dy / step);
        const nx = Math.max(0, Math.min(box.x + stepsX, canvasCols - box.w));
        const ny = Math.max(0, box.y + stepsY);
        if (nx !== box.x || ny !== box.y) {
          onDragEnd?.({ ...box, x: nx, y: ny });
        }
      } else {
        const stepsW = Math.round(dx / step);
        const stepsH = Math.round(dy / step);
        const nw = Math.max(minW, Math.min(box.w + stepsW, canvasCols - box.x));
        const nh = Math.max(minH, box.h + stepsH);
        if (nw !== box.w || nh !== box.h) {
          onResizeEnd?.({ ...box, w: nw, h: nh });
        }
      }
    },
    [mode, step, box, canvasCols, minW, minH, onDragEnd, onResizeEnd],
  );

  // Live overrides while dragging/resizing.
  const positionStyle: React.CSSProperties = gridItemStyle(box);
  const liveStyle: React.CSSProperties = {};
  if (mode === "drag") {
    liveStyle.transform = `translate3d(${delta.x}px, ${delta.y}px, 0)`;
    liveStyle.zIndex = 50;
    liveStyle.pointerEvents = "none";
  } else if (mode === "resize") {
    const stepsW = Math.round(delta.x / step);
    const stepsH = Math.round(delta.y / step);
    const nw = Math.max(minW, Math.min(box.w + stepsW, canvasCols - box.x));
    const nh = Math.max(minH, box.h + stepsH);
    positionStyle.gridColumn = `${box.x + 1} / span ${nw}`;
    positionStyle.gridRow = `${box.y + 1} / span ${nh}`;
    liveStyle.zIndex = 50;
  }

  return (
    <div
      style={{ ...positionStyle, ...liveStyle }}
      className={cn("relative min-h-0", className)}>
      {children}
      {enabled && (
        <>
          <button
            type="button"
            aria-label="Drag"
            onPointerDown={beginDrag}
            onPointerMove={handleMove}
            onPointerUp={finish}
            onPointerCancel={finish}
            className={cn(
              "absolute left-1 top-1 z-20 flex size-6 items-center justify-center rounded",
              "bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border",
              "hover:bg-background hover:text-foreground",
              "touch-none cursor-grab active:cursor-grabbing",
            )}>
            <GripVertical className="size-3.5" />
          </button>
          {canResize && (
            <div
              role="button"
              aria-label="Resize"
              onPointerDown={beginResize}
              onPointerMove={handleMove}
              onPointerUp={finish}
              onPointerCancel={finish}
              className={cn(
                "absolute bottom-0 right-0 z-20 size-4 cursor-se-resize",
                "touch-none rounded-tl-md",
                "bg-background/80 ring-1 ring-border",
                "after:absolute after:bottom-0.5 after:right-0.5 after:size-0",
                "after:border-b-[6px] after:border-r-[6px] after:border-l-[6px] after:border-t-[6px]",
                "after:border-transparent after:border-b-foreground/60 after:border-r-foreground/60",
              )}
            />
          )}
        </>
      )}
    </div>
  );
}
