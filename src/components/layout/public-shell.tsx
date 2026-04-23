"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/components/locale-provider";
import { AppFooter } from "@/components/layout/app-footer";
import { useBoardTitle } from "@/components/layout/board-title-provider";
import { LayoutModeProvider } from "@/components/layout/layout-mode-provider";
import { LayoutModeToggle } from "@/components/layout/layout-mode-toggle";
import { useLayoutMode } from "@/components/layout/layout-mode-provider";

function PublicShellInner({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const ctx = useBoardTitle();
  const boardTitle = ctx?.boardTitle ?? null;
  const { containerMode } = useLayoutMode();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          className={
            containerMode === "boxed"
              ? "mx-auto flex h-14 w-full max-w-screen-xl items-center justify-between px-4"
              : "flex h-14 w-full items-center justify-between px-4"
          }>
          <Link href="/board" className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/selfstack_symbol.svg"
              alt="Selfstack"
              className="h-6 w-auto"
            />
            <div className="flex flex-col leading-tight">
              <span>Selfstack</span>
              {boardTitle && (
                <span className="text-xs font-normal text-muted-foreground">
                  {boardTitle}
                </span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <LayoutModeToggle />
            <ThemeToggle />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/login" aria-label={t("auth.login")}>
                    <LogIn className="size-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("auth.login")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
      <div
        className={
          containerMode === "boxed"
            ? "mx-auto w-full max-w-screen-xl flex-1 p-3 md:p-6"
            : "w-full flex-1 p-3 md:p-6"
        }>
        {children}
      </div>
      <AppFooter />
    </div>
  );
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <LayoutModeProvider>
      <PublicShellInner>{children}</PublicShellInner>
    </LayoutModeProvider>
  );
}
