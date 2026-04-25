"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface InfoHintProps {
  /** Tooltip body. */
  children: React.ReactNode;
  /** Optional aria-label for the trigger. */
  label?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Small accessible "info" icon with a tooltip. Self-contained — provides
 * its own TooltipProvider so it can be dropped anywhere.
 */
export function InfoHint({
  children,
  label = "More information",
  className,
  iconClassName,
}: InfoHintProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}>
            <Info className={cn("size-3.5", iconClassName)} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
