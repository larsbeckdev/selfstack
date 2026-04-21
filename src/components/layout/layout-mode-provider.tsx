"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type LayoutContainerMode = "fullwidth" | "boxed";

const STORAGE_KEY = "app.layoutMode";

type Ctx = {
  containerMode: LayoutContainerMode;
  toggleContainerMode: () => void;
};

const LayoutModeContext = createContext<Ctx | null>(null);

export function LayoutModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [containerMode, setContainerMode] =
    useState<LayoutContainerMode>("fullwidth");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "boxed" || saved === "fullwidth") setContainerMode(saved);
  }, []);

  const toggleContainerMode = useCallback(() => {
    setContainerMode((prev) => {
      const next = prev === "fullwidth" ? "boxed" : "fullwidth";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <LayoutModeContext.Provider value={{ containerMode, toggleContainerMode }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export function useLayoutMode() {
  const ctx = useContext(LayoutModeContext);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. public routes)
    return {
      containerMode: "fullwidth" as LayoutContainerMode,
      toggleContainerMode: () => {},
    };
  }
  return ctx;
}
