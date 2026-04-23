"use client";

import { createContext, useContext, useEffect, useState } from "react";

type BoardTitleContextValue = {
  boardTitle: string | null;
  setBoardTitle: (title: string | null) => void;
};

const BoardTitleContext = createContext<BoardTitleContextValue | null>(null);

export function BoardTitleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [boardTitle, setBoardTitle] = useState<string | null>(null);
  return (
    <BoardTitleContext value={{ boardTitle, setBoardTitle }}>
      {children}
    </BoardTitleContext>
  );
}

export function useBoardTitle() {
  return useContext(BoardTitleContext);
}

/**
 * Client hook used by pages/components that want to publish the currently
 * viewed board title into the shell (sidebar header or public shell header).
 * Safe to call when no provider is present (no-op).
 */
export function usePublishBoardTitle(title: string | null, enabled: boolean) {
  const ctx = useContext(BoardTitleContext);
  useEffect(() => {
    if (!ctx) return;
    if (!enabled) {
      ctx.setBoardTitle(null);
      return;
    }
    ctx.setBoardTitle(title);
    return () => ctx.setBoardTitle(null);
  }, [ctx, title, enabled]);
}
