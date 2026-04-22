import { PointerSensor } from "@dnd-kit/core";
import type { PointerEvent } from "react";

// Selector for elements that should never start a drag when clicked.
const INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "label",
  '[role="button"]',
  '[role="menuitem"]',
  '[role="menu"]',
  '[role="option"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="slider"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  "[data-no-dnd]",
  "[data-radix-popper-content-wrapper]",
].join(",");

function isAnyOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  // Any open Radix dialog / alertdialog blocks new drag activation.
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
}

/**
 * PointerSensor that refuses to activate when:
 *  - the pointerdown happened on an interactive element (buttons, inputs,
 *    popovers, dialog content, etc.), or
 *  - any Radix Dialog / AlertDialog is currently open.
 *
 * This prevents clicks on inline buttons (e.g. the edit/color button on a
 * tile) from starting a drag, and prevents background items from being
 * dragged while a modal is open.
 */
export class SafePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent: event }: PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return false;

        if (isAnyOverlayOpen()) return false;

        const target = event.target as HTMLElement | null;
        if (target && typeof target.closest === "function") {
          if (target.closest(INTERACTIVE_SELECTOR)) return false;
        }

        return true;
      },
    },
  ];
}
