"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  deleteSession,
  createPendingTwoFactor,
  readPendingTwoFactor,
  clearPendingTwoFactor,
} from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/actions/settings";
import { logAudit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    username: z
      .string()
      .min(2, "Username must be at least 2 characters")
      .max(40)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Only lowercase letters, numbers and hyphens",
      ),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  requires2FA?: boolean;
};

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const user = await db.user.findUnique({
    where: { email: result.data.email },
  });

  if (!user || !(await bcrypt.compare(result.data.password, user.password))) {
    await logAudit({
      event: "login.failed",
      userId: user?.id ?? null,
      email: result.data.email,
      message: user ? "wrong password" : "unknown email",
    });
    return { error: "Ungültige Anmeldedaten" };
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    await createPendingTwoFactor(user.id);
    return { requires2FA: true };
  }

  await createSession(user.id);
  await logAudit({
    event: "login.success",
    userId: user.id,
    email: user.email,
  });

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect("/dashboard");
}

export async function loginVerify2FA(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const token = String(formData.get("token") ?? "").trim();
  if (!/^\d{6}$/.test(token)) {
    return { error: "Code muss 6 Ziffern haben" };
  }

  const userId = await readPendingTwoFactor();
  if (!userId) {
    return { error: "Sitzung abgelaufen, bitte erneut anmelden" };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    await clearPendingTwoFactor();
    return { error: "2FA nicht aktiv" };
  }

  const { verifyTotp } = await import("@/lib/totp");
  if (!verifyTotp(user.twoFactorSecret, token)) {
    await logAudit({
      event: "login.2fa.failed",
      userId: user.id,
      email: user.email,
    });
    return { error: "Ungültiger Code" };
  }

  await clearPendingTwoFactor();
  await createSession(user.id);
  await logAudit({
    event: "login.success",
    userId: user.id,
    email: user.email,
    message: "2fa",
  });

  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  redirect("/dashboard");
}

export async function cancelPendingLogin() {
  await clearPendingTwoFactor();
  redirect("/login");
}

export async function register(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  // Check if registration is enabled
  const regEnabled = await isRegistrationEnabled();
  if (!regEnabled) {
    return { error: "Registrierung ist derzeit deaktiviert" };
  }

  const raw = {
    name: formData.get("name") as string,
    username: formData.get("username") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const [existingEmail, existingUsername] = await Promise.all([
    db.user.findUnique({ where: { email: result.data.email } }),
    db.user.findUnique({ where: { username: result.data.username } }),
  ]);

  if (existingEmail) {
    return { error: "E-Mail-Adresse wird bereits verwendet" };
  }
  if (existingUsername) {
    return { error: "Benutzername wird bereits verwendet" };
  }

  const hashedPassword = await bcrypt.hash(result.data.password, 12);

  // First user becomes superadmin and gets a starter board. Everyone else
  // registers as "guest" — boards must be unlocked by an admin.
  const userCount = await db.user.count();
  const isFirstUser = userCount === 0;

  const user = await db.user.create({
    data: {
      name: result.data.name,
      username: result.data.username,
      email: result.data.email,
      password: hashedPassword,
      role: isFirstUser ? "superadmin" : "guest",
    },
  });

  // Only seed a default board for users that can actually own one.
  if (isFirstUser) {
    await db.board.create({
      data: {
        name: "My Dashboard",
        slug: `${result.data.username}/dashboard`,
        userId: user.id,
        order: 0,
      },
    });
  }

  await createSession(user.id);
  await logAudit({
    event: "register",
    userId: user.id,
    email: user.email,
  });
  redirect("/dashboard");
}

export async function logout() {
  const { getSession } = await import("@/lib/auth");
  const data = await getSession();
  if (data) {
    await logAudit({
      event: "logout",
      userId: data.user.id,
      email: data.user.email,
    });
  }
  await deleteSession();
  redirect("/login");
}

export async function forceChangePassword(newPassword: string) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) throw new Error("Nicht angemeldet");

  if (newPassword.length < 8) {
    throw new Error("Passwort muss mindestens 8 Zeichen lang sein");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashed, mustChangePassword: false },
  });
}
