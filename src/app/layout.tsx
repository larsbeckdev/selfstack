import type { Metadata } from "next";
import "@fontsource-variable/geist/wght.css";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeInitScript } from "@/components/theme-init-script";
import { ThemeApplier } from "@/components/theme-applier";
import { ThemeSyncer } from "@/components/theme-syncer";
import { LocaleProvider } from "@/components/locale-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoBanner } from "@/components/demo-banner";
import { isDemoMode, getDemoResetMinutes } from "@/lib/demo";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selfstack",
  description: "Personal Dashboard",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale: Locale = "de";
  let theme = "system";
  let themePreset = "default";
  let customColors: string | null = null;
  let hasSession = false;
  try {
    const session = await getSession();
    if (session) {
      hasSession = true;
      const { db } = await import("@/lib/db");
      const u = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          locale: true,
          theme: true,
          themePreset: true,
          customColors: true,
        },
      });
      if (u?.locale && (u.locale === "de" || u.locale === "en")) {
        locale = u.locale;
      }
      if (u?.theme && ["light", "dark", "system"].includes(u.theme)) {
        theme = u.theme;
      }
      if (u?.themePreset) themePreset = u.themePreset;
      if (u?.customColors) customColors = u.customColors;
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
        <ThemeInitScript preset={themePreset} customColors={customColors} />
      </head>
      <body
        className={`min-h-full flex flex-col bg-background text-foreground${
          isDemoMode() ? " pb-8" : ""
        }`}>
        <ThemeProvider defaultTheme={theme}>
          <ThemeApplier preset={themePreset} customColors={customColors} />
          {hasSession && <ThemeSyncer initialTheme={theme} />}
          <LocaleProvider locale={locale}>
            <TooltipProvider>
              {isDemoMode() && <DemoBanner minutes={getDemoResetMinutes()} />}
              {children}
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
