"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type GridCanvasProps = {
  /** Number of columns for this canvas. Defaults to the viewport cols. */
  cols?: number;
  /** Total rows (used to size the canvas when children are absolutely positioned via grid-row). */
  rows?: number;
  /** Show a dot-grid background. Typically true in edit mode. */
  showDots?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  ref?: React.Ref<HTMLDivElement>;
};

/**
 * Grid canvas container. Children are placed via `gridItemStyle`
 * (see `@/lib/grid`) using grid-column/grid-row spans.
 */
export function GridCanvas({
  cols,
  rows,
  showDots,
  className,
  style,
  children,
  onPointerDown,
  ref,
}: GridCanvasProps) {
  const canvasStyle: React.CSSProperties = { ...(style ?? {}) };
  if (typeof cols === "number") {
    (canvasStyle as Record<string, string>)["--canvas-cols"] = String(cols);
  }
  if (typeof rows === "number" && rows > 0) {
    canvasStyle.gridTemplateRows = `repeat(${rows}, var(--grid-u))`;
  }
  return (
    <div
      ref={ref}
      className={cn(
        "grid-canvas",
        showDots && "grid-canvas-dots rounded-md",
        className,
      )}
      style={canvasStyle}
      onPointerDown={onPointerDown}>
      {children}
    </div>
  );
}
