import type { Metadata } from "next";
import "@fontsource-variable/geist/wght.css";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeInitScript } from "@/components/theme-init-script";
import { ThemeApplier } from "@/components/theme-applier";
import { LocaleProvider } from "@/components/locale-provider";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selfstack",
  description: "Personal Dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale: Locale = "de";
  try {
    const session = await getSession();
    if (session) {
      const { db } = await import("@/lib/db");
      const u = await db.user.findUnique({
        where: { id: session.user.id },
        select: { locale: true },
      });
      if (u?.locale && (u.locale === "de" || u.locale === "en")) {
        locale = u.locale;
      }
    } else {
      const cookieStore = await cookies();
      const cookieLocale = cookieStore.get("selfstack-locale")?.value;
      if (cookieLocale === "de" || cookieLocale === "en") {
        locale = cookieLocale;
      }
    }
  } catch {
    // Not logged in or error, keep default
  }

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <ThemeApplier />
          <LocaleProvider locale={locale}>
            {children}
            <Toaster richColors position="bottom-right" />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
