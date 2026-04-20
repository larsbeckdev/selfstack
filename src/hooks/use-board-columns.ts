"use client";

import { useEffect, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";

export type BoardColumns = {
  /** Number of columns in the board's top-level grid. */
  columns: number;
  /** True on mobile (drag & drop should be disabled). */
  isMobile: boolean;
  /** True when the viewport is in portrait orientation. */
  isPortrait: boolean;
};

function getOrientation(): "portrait" | "landscape" {
  if (typeof window === "undefined") return "landscape";
  return window.matchMedia("(orientation: portrait)").matches
    ? "portrait"
    : "landscape";
}

function getViewport(): {
  width: number;
  orientation: "portrait" | "landscape";
} {
  if (typeof window === "undefined") {
    return { width: 1440, orientation: "landscape" };
  }
  return { width: window.innerWidth, orientation: getOrientation() };
}

/**
 * Computes the current board column count based on viewport width,
 * orientation, mobile flag, and sidebar state.
 *
 * Mirrors the table from the spec. Sidebar collapsed → +1 column on desktop.
 */
export function useBoardColumns(): BoardColumns {
  const { state, isMobile } = useSidebar();
  const sidebarOpen = state === "expanded";

  const [viewport, setViewport] = useState(() => getViewport());

  useEffect(() => {
    const onResize = () => setViewport(getViewport());
    window.addEventListener("resize", onResize);
    const mq = window.matchMedia("(orientation: portrait)");
    const onOrient = () => setViewport(getViewport());
    mq.addEventListener?.("change", onOrient);
    return () => {
      window.removeEventListener("resize", onResize);
      mq.removeEventListener?.("change", onOrient);
    };
  }, []);

  const { width, orientation } = viewport;
  const isPortrait = orientation === "portrait";

  // Mobile
  if (isMobile || width < 768) {
    return { columns: isPortrait ? 1 : 2, isMobile: true, isPortrait };
  }
  // Tablet
  if (width < 1200) {
    return { columns: isPortrait ? 2 : 3, isMobile: false, isPortrait };
  }
  // Desktop
  let columns: number;
  if (width < 1440) columns = sidebarOpen ? 4 : 5;
  else if (width < 1920) columns = sidebarOpen ? 6 : 7;
  else columns = sidebarOpen ? 8 : 9;

  return { columns, isMobile: false, isPortrait };
}
