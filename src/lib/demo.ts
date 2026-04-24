/**
 * Demo Mode
 * ---------
 * Enabled via `NEXT_PUBLIC_DEMO_MODE=true`. When active:
 *   - All destructive/persistent settings (profile, password, 2FA, admin)
 *     throw at the server-action boundary.
 *   - UI uses `isDemoMode()` to disable inputs + show a banner.
 *   - The database is automatically reset every
 *     `DEMO_RESET_MINUTES` (default 60) by `instrumentation.ts`.
 *
 * The flag is read from `NEXT_PUBLIC_*` so both the Node runtime and the
 * client bundle agree on the same value without an extra round-trip.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

/** Throw when the app is running in demo mode. Use in server actions. */
export function assertNotDemo(): void {
  if (DEMO_MODE) {
    throw new Error(
      "Demo mode active: this action is disabled. Changes are reset periodically.",
    );
  }
}

export function getDemoResetMinutes(): number {
  const n = Number(process.env.DEMO_RESET_MINUTES ?? 60);
  return Number.isFinite(n) && n > 0 ? n : 60;
}
