"use client";

import { GalleryHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/components/locale-provider";
import { useLayoutMode } from "./layout-mode-provider";

export function LayoutModeToggle() {
  const { t } = useTranslation();
  const { containerMode, toggleContainerMode } = useLayoutMode();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon" variant="ghost" onClick={toggleContainerMode}>
          <GalleryHorizontal className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {containerMode === "fullwidth"
          ? t("board.layoutBoxed")
          : t("board.layoutFullwidth")}
      </TooltipContent>
    </Tooltip>
  );
}

export function LayoutModeMain({ children }: { children: React.ReactNode }) {
  const { containerMode } = useLayoutMode();
  return (
    <main
      className={
        containerMode === "boxed"
          ? "mx-auto w-full max-w-screen-xl flex-1 p-3 md:p-6"
          : "flex-1 p-3 md:p-6"
      }>
      {children}
    </main>
  );
}
