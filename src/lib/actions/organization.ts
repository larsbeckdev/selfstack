"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { canViewAllBoards } from "@/lib/permissions";
import { assertNotDemo } from "@/lib/demo";

// ─── Schemas ────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const orgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(40).regex(slugRegex),
  icon: z.string().default("building-2"),
  iconUrl: z
    .string()
    .refine((v) => v.startsWith("/uploads/") || /^https?:\/\//.test(v), {
      message: "Invalid icon URL",
    })
    .nullable()
    .optional(),
});

const ORG_ROLES = ["owner", "admin", "editor", "member"] as const;
type OrgRole = (typeof ORG_ROLES)[number];

// ─── Access helpers ─────────────────────────────────────────────────────────

/**
 * Returns the org role for a user, considering global admin elevation.
 * Global admins are treated as org `owner`. Returns null when the user is
 * neither a global admin nor a member.
 */
export async function getOrgRole(
  orgId: string,
  userId: string,
  globalRole?: string,
): Promise<OrgRole | null> {
  if (canViewAllBoards(globalRole)) return "owner";
  const m = await db.organizationMember.findUnique({
    where: { orgId_userId: { orgId, userId } },
    select: { role: true },
  });
  return (m?.role as OrgRole | undefined) ?? null;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export async function getOrganizations() {
  await requireAdmin();
  return db.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, boards: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
}

export async function getOrganization(orgId: string) {
  await requireAdmin();
  return db.organization.findUnique({
    where: { id: orgId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
}

/**
 * Orgs the current user is a member of (or all, when global admin).
 */
export async function getMyOrganizations() {
  const { user } = await requireAuth();
  if (canViewAllBoards(user.role)) {
    return db.organization.findMany({
      orderBy: { name: "asc" },
    });
  }
  const rows = await db.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { organization: { name: "asc" } },
  });
  return rows.map((r) => r.organization);
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createOrganization(
  data: z.infer<typeof orgSchema>,
): Promise<{ id: string; slug: string }> {
  await requireAdmin();
  assertNotDemo();
  const parsed = orgSchema.parse(data);

  const existing = await db.organization.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });
  if (existing) throw new Error("Slug bereits vergeben");

  const org = await db.organization.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      icon: parsed.icon,
      iconUrl: parsed.iconUrl ?? null,
    },
    select: { id: true, slug: true },
  });

  revalidatePath("/admin/organizations");
  return org;
}

export async function updateOrganization(
  orgId: string,
  data: Partial<z.infer<typeof orgSchema>>,
) {
  await requireAdmin();
  assertNotDemo();

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organisation nicht gefunden");

  if (data.slug && data.slug !== org.slug) {
    if (!slugRegex.test(data.slug)) throw new Error("Ungültiger Slug");
    const existing = await db.organization.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    });
    if (existing && existing.id !== orgId) {
      throw new Error("Slug bereits vergeben");
    }
  }

  const slugChanged = !!(data.slug && data.slug !== org.slug);

  await db.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: orgId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.iconUrl !== undefined
          ? { iconUrl: data.iconUrl ?? null }
          : {}),
      },
    });

    // Cascade-rename board slugs that started with <oldSlug>/.
    if (slugChanged) {
      const oldPrefix = `${org.slug}/`;
      const newSlugPrefix = `${data.slug}/`;
      const boards = await tx.board.findMany({
        where: { orgId, slug: { startsWith: oldPrefix } },
        select: { id: true, slug: true },
      });
      for (const b of boards) {
        const tail = b.slug.slice(oldPrefix.length);
        let newSlug = `${newSlugPrefix}${tail}`;
        let n = 0;
        while (
          await tx.board.findFirst({
            where: { slug: newSlug, NOT: { id: b.id } },
            select: { id: true },
          })
        ) {
          n++;
          newSlug = `${newSlugPrefix}${tail}-${n}`;
        }
        await tx.board.update({ where: { id: b.id }, data: { slug: newSlug } });
      }
    }
  });

  revalidatePath("/admin/organizations");
  revalidatePath("/dashboard");
}

export async function deleteOrganization(orgId: string) {
  await requireAdmin();
  assertNotDemo();
  await db.organization.delete({ where: { id: orgId } });
  revalidatePath("/admin/organizations");
  revalidatePath("/dashboard");
}

// ─── Membership ─────────────────────────────────────────────────────────────

export async function addOrgMember(
  orgId: string,
  userId: string,
  role: OrgRole,
) {
  await requireAdmin();
  assertNotDemo();
  if (!ORG_ROLES.includes(role)) throw new Error("Ungültige Rolle");
  await db.organizationMember.upsert({
    where: { orgId_userId: { orgId, userId } },
    update: { role },
    create: { orgId, userId, role },
  });
  revalidatePath("/admin/organizations");
}

export async function updateOrgMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole,
) {
  await requireAdmin();
  assertNotDemo();
  if (!ORG_ROLES.includes(role)) throw new Error("Ungültige Rolle");
  await db.organizationMember.update({
    where: { orgId_userId: { orgId, userId } },
    data: { role },
  });
  revalidatePath("/admin/organizations");
}

export async function removeOrgMember(orgId: string, userId: string) {
  await requireAdmin();
  assertNotDemo();
  await db.organizationMember.delete({
    where: { orgId_userId: { orgId, userId } },
  });
  revalidatePath("/admin/organizations");
}

export async function getAvailableUsersForOrg(orgId: string) {
  await requireAdmin();
  return db.user.findMany({
    where: { orgMembers: { none: { orgId } } },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
    },
    orderBy: { name: "asc" },
  });
}

/** Admin helper: list org memberships for a specific user. */
export async function getUserOrganizations(userId: string) {
  await requireAdmin();
  return db.organizationMember.findMany({
    where: { userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true, icon: true, iconUrl: true },
      },
    },
    orderBy: { organization: { name: "asc" } },
  });
}
