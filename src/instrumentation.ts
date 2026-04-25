/**
 * Next.js instrumentation hook. Runs once per Node.js server process.
 *
 * In demo mode (`NEXT_PUBLIC_DEMO_MODE=true`) this wipes the database and
 * seeds fresh demo content on startup, then schedules a periodic reset every
 * `DEMO_RESET_MINUTES` (default 60).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Always run the idempotent role migration on startup so legacy "user"
  // values get mapped to the new role system and the first user is promoted
  // to superadmin.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    const { migrateRolesV2 } = await import("./lib/role-migration");
    await migrateRolesV2();
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;

  const { seedDemoData } = await import("./lib/demo-seed");
  const { getDemoResetMinutes } = await import("./lib/demo");

  const run = async (label: string) => {
    const start = Date.now();
    try {
      await seedDemoData();
      console.log(
        `[demo] ${label} complete in ${Date.now() - start}ms (admin@selfstack.local / admin123)`,
      );
    } catch (err) {
      console.error("[demo] reset failed:", err);
    }
  };

  await run("initial seed");

  const intervalMs = getDemoResetMinutes() * 60_000;
  setInterval(() => {
    void run("scheduled reset");
  }, intervalMs);
  console.log(
    `[demo] scheduled auto-reset every ${getDemoResetMinutes()} minutes`,
  );
}
