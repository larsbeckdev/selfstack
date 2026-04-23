"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? "system") as "light" | "dark" | "system";

  const next =
    current === "light" ? "dark" : current === "dark" ? "system" : "light";

  const label =
    current === "light"
      ? "Hellmodus"
      : current === "dark"
        ? "Dunkelmodus"
        : "System";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setTheme(next)}>
          {current === "light" && <Sun className="size-4" />}
          {current === "dark" && <Moon className="size-4" />}
          {current === "system" && <Monitor className="size-4" />}
          <span className="sr-only">Theme wechseln</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
