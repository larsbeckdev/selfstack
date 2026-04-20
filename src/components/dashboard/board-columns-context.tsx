"use client";

import { createContext, useContext } from "react";

export type BoardColumnsContextValue = {
  columns: number;
  isMobile: boolean;
};

const Ctx = createContext<BoardColumnsContextValue>({
  columns: 6,
  isMobile: false,
});

export const BoardColumnsProvider = Ctx.Provider;
export function useBoardColumnsContext() {
  return useContext(Ctx);
}
