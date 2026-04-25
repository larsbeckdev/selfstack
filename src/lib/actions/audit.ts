"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export type AuditEntry = {
  id: string;
  event: string;
  userId: string | null;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
  message: string | null;
  createdAt: Date;
  userName: string | null;
};

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
  await requireAdmin();

  const rows = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 1000),
  });

  const userIds = Array.from(
    new Set(rows.map((r) => r.userId).filter((v): v is string => !!v)),
  );
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    userId: r.userId,
    email: r.email,
    ip: r.ip,
    userAgent: r.userAgent,
    message: r.message,
    createdAt: r.createdAt,
    userName: r.userId ? (nameById.get(r.userId) ?? null) : null,
  }));
}
