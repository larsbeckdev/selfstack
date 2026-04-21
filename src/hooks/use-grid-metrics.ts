"use client";

import { useEffect, useState } from "react";

/**
 * Reads the live `--grid-u` and `--grid-gap` CSS vars from :root in px.
 * Keeps in sync with viewport breakpoint changes.
 */
export function useGridMetrics(): { unit: number; gap: number } {
  const [m, setM] = useState<{ unit: number; gap: number }>({
    unit: 72,
    gap: 8,
  });
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      const u = parseFloat(cs.getPropertyValue("--grid-u")) || 72;
      const gap = parseFloat(cs.getPropertyValue("--grid-gap")) || 8;
      setM({ unit: u, gap });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return m;
}
