"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useGridMetrics } from "@/hooks/use-grid-metrics";
import type { GridBox } from "@/lib/grid";
import { gridItemStyle } from "@/lib/grid";

type Pointer = React.PointerEvent<HTMLElement>;

type HandlerProps = {
  onPointerDown: (e: Pointer) => void;
  onPointerMove: (e: Pointer) => void;
  onPointerUp: (e: Pointer) => void;
  onPointerCancel: (e: Pointer) => void;
};

export type DragContext = {
  enabled: boolean;
  isDragging: boolean;
  isResizing: boolean;
  /** Spread onto the element the user should grab to drag the card (typically the card header). */
  dragHandleProps: HandlerProps & {
    className: string;
    style: React.CSSProperties;
    "data-drag-handle": true;
  };
  /** Spread onto the resize corner element. Null if `canResize` is false. */
  resizeHandleProps:
    | (HandlerProps & {
        className: string;
        style: React.CSSProperties;
        "data-resize-handle": true;
      })
    | null;
};

const Ctx = React.createContext<DragContext | null>(null);

/** Read drag handlers from the surrounding <DraggableItem>. Returns null when not inside one. */
export function useDrag(): DragContext | null {
  return React.useContext(Ctx);
}

type Props = {
  box: GridBox;
  canvasCols: number;
  /** If false the element is statically positioned and handles are no-ops. */
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
 * Grid-positioned wrapper. Children call {@link useDrag} to attach
 * `dragHandleProps` (typically to the card header) and the optional
 * `resizeHandleProps` (to a corner widget). While dragging/resizing, the
 * wrapper snaps cell-by-cell so preview position == final position.
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
    (e: Pointer) => {
      if (!enabled || e.button !== 0) return;
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
    (e: Pointer) => {
      if (!enabled || e.button !== 0) return;
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
    (e: Pointer) => {
      if (mode === "idle") return;
      setDelta({
        x: e.clientX - startRef.current.x,
        y: e.clientY - startRef.current.y,
      });
    },
    [mode],
  );

  const finish = React.useCallback(
    (e: Pointer) => {
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

  // Snap-preview: while dragging/resizing, override the grid area so the
  // wrapper jumps cell-by-cell — preview position == final position.
  const positionStyle: React.CSSProperties = gridItemStyle(box);
  if (mode === "drag") {
    const stepsX = Math.round(delta.x / step);
    const stepsY = Math.round(delta.y / step);
    const nx = Math.max(0, Math.min(box.x + stepsX, canvasCols - box.w));
    const ny = Math.max(0, box.y + stepsY);
    positionStyle.gridColumn = `${nx + 1} / span ${box.w}`;
    positionStyle.gridRow = `${ny + 1} / span ${box.h}`;
  } else if (mode === "resize") {
    const stepsW = Math.round(delta.x / step);
    const stepsH = Math.round(delta.y / step);
    const nw = Math.max(minW, Math.min(box.w + stepsW, canvasCols - box.x));
    const nh = Math.max(minH, box.h + stepsH);
    positionStyle.gridColumn = `${box.x + 1} / span ${nw}`;
    positionStyle.gridRow = `${box.y + 1} / span ${nh}`;
  }

  const ctxValue: DragContext = {
    enabled,
    isDragging: mode === "drag",
    isResizing: mode === "resize",
    dragHandleProps: {
      onPointerDown: beginDrag,
      onPointerMove: handleMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      className: cn(
        "select-none touch-none",
        enabled && "cursor-grab active:cursor-grabbing",
      ),
      style: { touchAction: "none" },
      "data-drag-handle": true,
    },
    resizeHandleProps: canResize
      ? {
          onPointerDown: beginResize,
          onPointerMove: handleMove,
          onPointerUp: finish,
          onPointerCancel: finish,
          className: "select-none touch-none cursor-se-resize",
          style: { touchAction: "none" },
          "data-resize-handle": true,
        }
      : null,
  };

  return (
    <div
      style={positionStyle}
      className={cn(
        "relative min-h-0",
        mode === "drag" && "z-50",
        mode === "resize" && "z-40",
        className,
      )}
      data-drag-state={mode}>
      <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>
    </div>
  );
}
