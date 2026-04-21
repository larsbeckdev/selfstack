"use client";

import { useEffect, useState } from "react";

/** Mirrors the CSS breakpoints in globals.css. */
export type GridViewport = {
  cols: number;
  isMobile: boolean;
};

function readViewport(): GridViewport {
  if (typeof window === "undefined") return { cols: 12, isMobile: false };
  const w = window.innerWidth;
  if (w < 768) return { cols: 4, isMobile: true };
  if (w < 1280) return { cols: 8, isMobile: false };
  return { cols: 12, isMobile: false };
}

export function useGridViewport(): GridViewport {
  const [vp, setVp] = useState<GridViewport>(() => readViewport());
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(readViewport()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return vp;
}
