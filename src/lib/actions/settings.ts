"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { assertNotDemo } from "@/lib/demo";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  generatePassword,
  sendTestEmail,
  loadSmtpConfig,
} from "@/lib/email";

// ─── User Settings Actions ──────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  username: z
    .string()
    .min(2)
    .max(40)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Nur Kleinbuchstaben, Zahlen und Bindestriche",
    ),
  email: z.string().email(),
  image: z.string().url().optional().or(z.literal("")),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  assertNotDemo();
  const { user } = await requireAuth();
  const parsed = updateProfileSchema.parse(data);

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { email: true, username: true, role: true },
  });
  if (!dbUser) throw new Error("User not found");

  if (parsed.email !== dbUser.email) {
    const existing = await db.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) throw new Error("E-Mail wird bereits verwendet");
  }

  const usernameChanged = parsed.username !== dbUser.username;
  if (usernameChanged) {
    const existing = await db.user.findUnique({
      where: { username: parsed.username },
    });
    if (existing) throw new Error("Username wird bereits verwendet");
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: parsed.name,
        username: parsed.username,
        email: parsed.email,
        image: parsed.image || null,
      },
    });

    // Cascade-rename board slugs that started with the old username/.
    // Admin-owned system boards (no "/" in slug) stay untouched.
    if (usernameChanged && dbUser.role !== "admin" && dbUser.username) {
      const oldPrefix = `${dbUser.username}/`;
      const boards = await tx.board.findMany({
        where: { userId: user.id, slug: { startsWith: oldPrefix } },
        select: { id: true, slug: true },
      });
      for (const b of boards) {
        const tail = b.slug.slice(oldPrefix.length);
        let newSlug = `${parsed.username}/${tail}`;
        let n = 0;
        while (
          await tx.board.findFirst({
            where: { slug: newSlug, NOT: { id: b.id } },
            select: { id: true },
          })
        ) {
          n++;
          newSlug = `${parsed.username}/${tail}-${n}`;
        }
        await tx.board.update({ where: { id: b.id }, data: { slug: newSlug } });
      }
    }
  });

  revalidatePath("/settings");
}

export async function changePassword(
  data: z.infer<typeof changePasswordSchema>,
) {
  assertNotDemo();
  const { user } = await requireAuth();
  const parsed = changePasswordSchema.parse(data);

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new Error("User not found");

  const valid = await bcrypt.compare(parsed.currentPassword, dbUser.password);
  if (!valid) throw new Error("Aktuelles Passwort ist falsch");

  const hashed = await bcrypt.hash(parsed.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashed, mustChangePassword: false },
  });
}

export async function deleteAccount() {
  assertNotDemo();
  const { user } = await requireAuth();
  await db.user.delete({ where: { id: user.id } });
}

// ─── Two-Factor (TOTP) ──────────────────────────────────────────────────────

export async function getTwoFactorStatus(): Promise<{ enabled: boolean }> {
  const { user } = await requireAuth();
  const u = await db.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabled: true },
  });
  return { enabled: !!u?.twoFactorEnabled };
}

/**
 * Generate a fresh enrollment secret + QR code. The secret is stored on
 * the user row but NOT yet activated — `twoFactorEnabled` stays false
 * until the user confirms with a valid token.
 */
export async function beginTwoFactorEnrollment(): Promise<{
  secret: string;
  qrCode: string;
}> {
  assertNotDemo();
  const { generateTotpSecret, renderQrCodeDataUrl } =
    await import("@/lib/totp");
  const { user } = await requireAuth();
  const secret = generateTotpSecret();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  if (!dbUser) throw new Error("User not found");

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const qrCode = await renderQrCodeDataUrl(dbUser.email, secret);
  return { secret, qrCode };
}

export async function confirmTwoFactorEnrollment(token: string) {
  assertNotDemo();
  const { verifyTotp } = await import("@/lib/totp");
  const { user } = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });
  if (!dbUser?.twoFactorSecret) {
    throw new Error("Keine laufende 2FA-Einrichtung");
  }
  if (!verifyTotp(dbUser.twoFactorSecret, token)) {
    throw new Error("Ungültiger Code");
  }
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
  revalidatePath("/settings");
}

export async function disableTwoFactor(password: string) {
  assertNotDemo();
  const { user } = await requireAuth();
  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) throw new Error("User not found");

  const ok = await bcrypt.compare(password, dbUser.password);
  if (!ok) throw new Error("Passwort ist falsch");

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  revalidatePath("/settings");
}

// ─── Admin User Management ──────────────────────────────────────────────────

export async function getUsers() {
  await requireAdmin();
  return db.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { boards: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Admin helper: list all boards owned by a specific user. */
export async function getUserBoards(userId: string) {
  await requireAdmin();
  return db.board.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      iconUrl: true,
      isPublic: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { order: "asc" },
  });
}

export async function updateUserRole(userId: string, role: string) {
  await requireAdmin();
  assertNotDemo();

  if (!["user", "editor", "admin"].includes(role)) {
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
  assertNotDemo();

  if (userId === user.id) {
    throw new Error("Du kannst dich nicht selbst löschen");
  }

  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function adminCreateUser(data: {
  name: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  sendEmail?: boolean;
}): Promise<{ generatedPassword?: string }> {
  await requireAdmin();
  assertNotDemo();

  const username = data.username.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(username)) {
    throw new Error(
      "Username: nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt",
    );
  }

  const [existingEmail, existingUsername] = await Promise.all([
    db.user.findUnique({ where: { email: data.email } }),
    db.user.findUnique({ where: { username } }),
  ]);
  if (existingEmail) throw new Error("E-Mail wird bereits verwendet");
  if (existingUsername) throw new Error("Username wird bereits verwendet");

  if (!["user", "editor", "admin"].includes(data.role)) {
    throw new Error("Invalid role");
  }

  const plainPassword = data.password || generatePassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 12);
  const mustChange = !data.password; // generated password → must change

  const user = await db.user.create({
    data: {
      name: data.name,
      username,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      mustChangePassword: mustChange,
    },
  });

  await db.board.create({
    data: {
      name: "Mein Dashboard",
      slug: `${username}/dashboard`,
      userId: user.id,
      order: 0,
    },
  });

  if (data.sendEmail) {
    const loginUrl = `${await getAppUrl()}/login`;
    await sendWelcomeEmail(data.email, data.name, plainPassword, loginUrl);
  }

  revalidatePath("/admin/users");
  return { generatedPassword: mustChange ? plainPassword : undefined };
}

export async function adminResetPassword(userId: string) {
  await requireAdmin();
  assertNotDemo();

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Benutzer nicht gefunden");

  const plainPassword = generatePassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  await db.user.update({
    where: { id: userId },
    data: { password: hashedPassword, mustChangePassword: true },
  });

  revalidatePath("/admin/users");
  return { generatedPassword: plainPassword };
}

export async function adminSendPasswordEmail(userId: string, password: string) {
  await requireAdmin();
  assertNotDemo();

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("Benutzer nicht gefunden");

  const loginUrl = `${await getAppUrl()}/login`;
  await sendPasswordResetEmail(target.email, target.name, password, loginUrl);
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

// ─── UI Preferences (sidebar + theme mode) ──────────────────────────────────

export async function setSidebarOpen(open: boolean) {
  const { user } = await requireAuth();
  await db.user.update({
    where: { id: user.id },
    data: { sidebarOpen: open },
  });
}

export async function setUserTheme(theme: string) {
  const { user } = await requireAuth();
  if (!["light", "dark", "system"].includes(theme)) {
    throw new Error("Invalid theme");
  }
  await db.user.update({
    where: { id: user.id },
    data: { theme },
  });
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
  assertNotDemo();

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

export async function getAppUrl(): Promise<string> {
  const fromDb = await getSystemSetting("app_url");
  return (fromDb || process.env.APP_URL || "http://localhost:3025").replace(
    /\/$/,
    "",
  );
}

// ─── SMTP Settings ──────────────────────────────────────────────────────────

export type SmtpSettings = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
  hasPassword: boolean;
};

const SMTP_KEY_MAP = {
  host: "smtp_host",
  port: "smtp_port",
  secure: "smtp_secure",
  user: "smtp_user",
  pass: "smtp_pass",
  from: "smtp_from",
} as const;

export async function getSmtpSettings(): Promise<SmtpSettings> {
  await requireAdmin();
  const cfg = await loadSmtpConfig();
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user,
    from: cfg.from,
    hasPassword: cfg.pass.length > 0,
  };
}

const smtpInputSchema = z.object({
  host: z.string().trim().max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().trim().max(255),
  password: z.string().max(1024).optional(),
  clearPassword: z.boolean().optional(),
  from: z.string().trim().max(255),
});

export async function updateSmtpSettings(
  input: z.infer<typeof smtpInputSchema>,
) {
  await requireAdmin();
  assertNotDemo();
  const parsed = smtpInputSchema.parse(input);

  const writes: Array<Promise<unknown>> = [
    db.systemSetting.upsert({
      where: { key: SMTP_KEY_MAP.host },
      update: { value: parsed.host },
      create: { key: SMTP_KEY_MAP.host, value: parsed.host },
    }),
    db.systemSetting.upsert({
      where: { key: SMTP_KEY_MAP.port },
      update: { value: String(parsed.port) },
      create: { key: SMTP_KEY_MAP.port, value: String(parsed.port) },
    }),
    db.systemSetting.upsert({
      where: { key: SMTP_KEY_MAP.secure },
      update: { value: parsed.secure ? "true" : "false" },
      create: {
        key: SMTP_KEY_MAP.secure,
        value: parsed.secure ? "true" : "false",
      },
    }),
    db.systemSetting.upsert({
      where: { key: SMTP_KEY_MAP.user },
      update: { value: parsed.user },
      create: { key: SMTP_KEY_MAP.user, value: parsed.user },
    }),
    db.systemSetting.upsert({
      where: { key: SMTP_KEY_MAP.from },
      update: { value: parsed.from },
      create: { key: SMTP_KEY_MAP.from, value: parsed.from },
    }),
  ];

  if (parsed.clearPassword) {
    writes.push(
      db.systemSetting.upsert({
        where: { key: SMTP_KEY_MAP.pass },
        update: { value: "" },
        create: { key: SMTP_KEY_MAP.pass, value: "" },
      }),
    );
  } else if (parsed.password && parsed.password.length > 0) {
    writes.push(
      db.systemSetting.upsert({
        where: { key: SMTP_KEY_MAP.pass },
        update: { value: parsed.password },
        create: { key: SMTP_KEY_MAP.pass, value: parsed.password },
      }),
    );
  }

  await Promise.all(writes);
  revalidatePath("/admin", "layout");
}

export async function sendTestSmtpEmail(to: string) {
  await requireAdmin();
  assertNotDemo();
  const parsed = z.string().email().parse(to);
  await sendTestEmail(parsed);
}
