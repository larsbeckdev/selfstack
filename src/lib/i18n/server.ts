import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { t, type Locale, type TranslationKey } from "./index";

export async function getLocale(): Promise<Locale> {
  try {
    const session = await getSession();
    if (session) {
      const u = await db.user.findUnique({
        where: { id: session.user.id },
        select: { locale: true },
      });
      if (u?.locale === "de" || u?.locale === "en") return u.locale;
    }
  } catch {
    // ignore
  }
  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get("selfstack-locale")?.value;
    if (cookieLocale === "de" || cookieLocale === "en") return cookieLocale;
  } catch {
    // ignore
  }
  return "de";
}

export async function getTranslator(): Promise<
  (key: TranslationKey) => string
> {
  const locale = await getLocale();
  return (key) => t(locale, key);
}
