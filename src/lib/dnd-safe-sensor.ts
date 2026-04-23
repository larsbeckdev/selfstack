import { PointerSensor } from "@dnd-kit/core";
import type { PointerEvent } from "react";

// Selector for inner controls that should never start a drag. Keep this small:
// the PointerSensor's activation distance already prevents plain clicks from
// turning into drags. We only need to explicitly block UI controls where a
// `pointerdown` is the start of a semantically different interaction (e.g.
// opening an inline menu on a tile action button).
const NO_DND_SELECTOR = [
  "[data-no-dnd]",
  "[data-radix-popper-content-wrapper]",
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="listbox"]',
  '[role="combobox"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  "input",
  "textarea",
  "select",
].join(",");

function isAnyOverlayOpen(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
}

/**
 * PointerSensor that refuses to activate when:
 *  - any Radix Dialog / AlertDialog is currently open, or
 *  - the pointerdown happened inside an explicit `data-no-dnd` region, an
 *    input-like control, or an open Radix menu / popover surface.
 *
 * Links and buttons are intentionally NOT blocked — the sensor's distance
 * activation constraint (configured via useSensor options) already makes a
 * plain click behave like a click and a pointer drag behave like a drag.
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
          if (target.closest(NO_DND_SELECTOR)) return false;
        }

        return true;
      },
    },
  ];
}
