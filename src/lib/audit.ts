import { headers } from "next/headers";
import { db } from "./db";

export type AuditEvent =
  | "login.success"
  | "login.failed"
  | "login.2fa.failed"
  | "logout"
  | "register";

/**
 * Best-effort write to the audit log. Never throws — auth flows must
 * succeed even if the audit insert fails.
 */
export async function logAudit(input: {
  event: AuditEvent;
  userId?: string | null;
  email?: string | null;
  message?: string | null;
}) {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const userAgent = h.get("user-agent") || null;

    await db.auditLog.create({
      data: {
        event: input.event,
        userId: input.userId ?? null,
        email: input.email ?? null,
        ip,
        userAgent,
        message: input.message ?? null,
      },
    });
  } catch (e) {
    // Swallow — auditing must never break the auth path.
    console.error("[audit] failed", e);
  }
}
