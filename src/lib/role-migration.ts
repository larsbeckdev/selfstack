/**
 * One-time idempotent migration of legacy role values into the new
 * 6-role system (guest|viewer|member|editor|admin|superadmin).
 *
 * Mapping:
 *   - "user"  → "member"   (legacy default)
 *   - "editor"→ "editor"   (kept)
 *   - "admin" → "admin"    (kept)
 *
 * Plus: ensure exactly one superadmin exists. The OLDEST user (by createdAt)
 * is promoted to superadmin if there is none yet. This makes the very first
 * user — typically the bootstrap admin — the system superadmin.
 *
 * Marked complete via a SystemSetting row so the migration is a no-op on
 * subsequent boots.
 */
import { db } from "./db";

const MARKER_KEY = "role_migration_v2_done";

export async function migrateRolesV2() {
  try {
    const done = await db.systemSetting.findUnique({
      where: { key: MARKER_KEY },
    });
    if (done?.value === "1") return;

    // 1) legacy "user" → "member"
    await db.user.updateMany({
      where: { role: "user" },
      data: { role: "member" },
    });

    // 2) Ensure one superadmin
    const existingSuper = await db.user.findFirst({
      where: { role: "superadmin" },
      select: { id: true },
    });
    if (!existingSuper) {
      const oldest = await db.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (oldest) {
        await db.user.update({
          where: { id: oldest.id },
          data: { role: "superadmin" },
        });
      }
    }

    // 3) Sanitize: any unknown role string falls back to "guest" so the
    //    permission engine has a safe default.
    const known = [
      "guest",
      "viewer",
      "member",
      "editor",
      "admin",
      "superadmin",
    ];
    await db.user.updateMany({
      where: { role: { notIn: known } },
      data: { role: "guest" },
    });

    await db.systemSetting.upsert({
      where: { key: MARKER_KEY },
      update: { value: "1" },
      create: { key: MARKER_KEY, value: "1" },
    });

    console.log(
      "[role-migration] mapped legacy roles → guest/member/editor/admin/superadmin",
    );
  } catch (err) {
    // Don't crash the server if the migration fails — just log so an admin
    // can investigate. Permission code defaults to "guest" for safety.
    console.error("[role-migration] failed:", err);
  }
}
