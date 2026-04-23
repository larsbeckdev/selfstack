import { isDemoMode, getDemoResetMinutes } from "@/lib/demo";

/**
 * Thin banner shown at the bottom of every page when demo mode is active.
 * Sticky to the viewport bottom so it's always visible regardless of scroll.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  const minutes = getDemoResetMinutes();
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950 shadow-[0_-1px_3px_rgba(0,0,0,0.15)] dark:bg-amber-400 dark:text-amber-950">
      <span className="inline-block size-2 rounded-full bg-amber-950/80" />
      Demo-Modus aktiv &middot; Änderungen sind deaktiviert &middot;
      automatischer Reset alle {minutes}&nbsp;Minuten
    </div>
  );
}
