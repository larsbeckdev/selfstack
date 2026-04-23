import { isDemoMode, getDemoResetMinutes } from "@/lib/demo";

/**
 * Thin banner shown on every page when demo mode is active. Informs the user
 * that settings are read-only and when the next reset will occur.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;
  const minutes = getDemoResetMinutes();
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950 dark:bg-amber-400 dark:text-amber-950">
      <span className="inline-block size-2 rounded-full bg-amber-950/80" />
      Demo-Modus aktiv &middot; Änderungen sind deaktiviert &middot;
      automatischer Reset alle {minutes}&nbsp;Minuten
    </div>
  );
}
