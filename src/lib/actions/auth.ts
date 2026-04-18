"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth";
import { isRegistrationEnabled } from "@/lib/actions/settings";

const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
    email: z.string().email("Ungültige E-Mail-Adresse"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
    confirmPassword: z.string().min(1, "Passwort-Bestätigung ist erforderlich"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  });

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
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
    return { error: "Ungültige Anmeldedaten" };
  }

  await createSession(user.id);

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  redirect("/dashboard");
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
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  const existing = await db.user.findUnique({
    where: { email: result.data.email },
  });

  if (existing) {
    return { error: "E-Mail-Adresse wird bereits verwendet" };
  }

  const hashedPassword = await bcrypt.hash(result.data.password, 12);

  const user = await db.user.create({
    data: {
      name: result.data.name,
      email: result.data.email,
      password: hashedPassword,
    },
  });

  // Create default board for new user
  await db.board.create({
    data: {
      name: "Mein Dashboard",
      slug: `dashboard-${user.id.slice(0, 8)}`,
      userId: user.id,
      order: 0,
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function forceChangePassword(newPassword: string) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) throw new Error("Nicht angemeldet");

  if (newPassword.length < 8) {
    throw new Error("Passwort muss mindestens 8 Zeichen haben");
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashed, mustChangePassword: false },
  });
}
