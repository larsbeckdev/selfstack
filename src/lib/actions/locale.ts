"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function setLocaleCookie(locale: string) {
  if (!["de", "en"].includes(locale)) {
    throw new Error("Invalid locale");
  }

  const cookieStore = await cookies();
  cookieStore.set("selfstack-locale", locale, {
    httpOnly: false,
    secure: process.env.SECURE_COOKIES === "true",
    sameSite: "lax",
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: "/",
  });

  revalidatePath("/", "layout");
}
