"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";

// ─── User Settings Actions ──────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  image: z.string().url().optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const { user } = await requireAuth();
  const parsed = updateProfileSchema.parse(data);

  if (parsed.email !== user.email) {
    const existing = await db.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) throw new Error("E-Mail wird bereits verwendet");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.name,
      email: parsed.email,
      image: parsed.image || null,
    },
  });

  revalidatePath("/settings");
}

export async function changePassword(
  data: z.infer<typeof changePasswordSchema>,
) {
  const { user } = await requireAuth();
  const parsed = changePasswordSchema.parse(data);

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new Error("User not found");

  const valid = await bcrypt.compare(parsed.currentPassword, dbUser.password);
  if (!valid) throw new Error("Aktuelles Passwort ist falsch");

  const hashed = await bcrypt.hash(parsed.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });
}

export async function deleteAccount() {
  const { user } = await requireAuth();
  await db.user.delete({ where: { id: user.id } });
}

// ─── Admin User Management ──────────────────────────────────────────────────

export async function getUsers() {
  await requireAdmin();
  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { boards: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUserRole(userId: string, role: string) {
  await requireAdmin();

  if (!["user", "admin"].includes(role)) {
    throw new Error("Invalid role");
  }

  await db.user.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const { user } = await requireAdmin();

  if (userId === user.id) {
    throw new Error("Du kannst dich nicht selbst löschen");
  }

  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function adminCreateUser(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}) {
  await requireAdmin();

  const existing = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("E-Mail wird bereits verwendet");

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
  });

  await db.board.create({
    data: {
      name: "Mein Dashboard",
      slug: `dashboard-${user.id.slice(0, 8)}`,
      userId: user.id,
      order: 0,
    },
  });

  revalidatePath("/admin/users");
  return user;
}

// ─── Admin Stats ─────────────────────────────────────────────────────────────

export async function getAdminStats() {
  await requireAdmin();

  const [userCount, boardCount, publicBoardCount] = await Promise.all([
    db.user.count(),
    db.board.count(),
    db.board.count({ where: { isPublic: true } }),
  ]);

  return { userCount, boardCount, publicBoardCount };
}

// ─── Theme Actions ──────────────────────────────────────────────────────────

export async function saveThemePreference(
  themePreset: string,
  customColors?: string | null,
) {
  const { user } = await requireAuth();

  await db.user.update({
    where: { id: user.id },
    data: {
      themePreset,
      customColors: customColors ?? null,
    },
  });
}

export async function getThemePreference() {
  const { user } = await requireAuth();

  const u = await db.user.findUnique({
    where: { id: user.id },
    select: { themePreset: true, customColors: true },
  });

  return {
    themePreset: u?.themePreset ?? "default",
    customColors: u?.customColors ?? null,
  };
}

// ─── Locale Actions ─────────────────────────────────────────────────────────

export async function updateLocale(locale: string) {
  const { user } = await requireAuth();

  if (!["de", "en"].includes(locale)) {
    throw new Error("Invalid locale");
  }

  await db.user.update({
    where: { id: user.id },
    data: { locale },
  });

  revalidatePath("/", "layout");
}

export async function getUserLocale(): Promise<string> {
  const { user } = await requireAuth();

  const u = await db.user.findUnique({
    where: { id: user.id },
    select: { locale: true },
  });

  return u?.locale ?? "de";
}

// ─── System Settings Actions ────────────────────────────────────────────────

export async function getSystemSetting(key: string): Promise<string | null> {
  const setting = await db.systemSetting.findUnique({ where: { key } });
  return setting?.value ?? null;
}

export async function setSystemSetting(key: string, value: string) {
  await requireAdmin();

  await db.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  revalidatePath("/admin", "layout");
}

export async function isRegistrationEnabled(): Promise<boolean> {
  const val = await getSystemSetting("registration_enabled");
  return val !== "false"; // default to true
}
