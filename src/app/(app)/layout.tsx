import { redirect } from "next/navigation";
import Link from "next/link";
import { Layers, LogIn } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { PersistedSidebarProvider } from "@/components/layout/persisted-sidebar-provider";
import { LayoutModeProvider } from "@/components/layout/layout-mode-provider";
import { LayoutModeMain } from "@/components/layout/layout-mode-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Unauthenticated users get a minimal public shell. Individual pages inside
  // this layout are responsible for redirecting to /login if they require a
  // session. The only route that renders for unauthenticated visitors is
  // /board/<slug> with a public board.
  if (!session) {
    const t = await getTranslator();
    return (
      <div className="min-h-svh">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Layers className="size-5 text-primary" />
              Selfstack
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 size-4" />
                  {t("auth.login")}
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </div>
    );
  }

  // Force password change if required
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true, sidebarOpen: true },
  });
  if (user?.mustChangePassword) redirect("/change-password");

  const boards = await db.board.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  });

  return (
    <PersistedSidebarProvider defaultOpen={user?.sidebarOpen ?? true}>
      <LayoutModeProvider>
        <AppSidebar user={session.user} boards={boards} />
        <SidebarInset>
          <AppHeader user={session.user} />
          <LayoutModeMain>{children}</LayoutModeMain>
        </SidebarInset>
      </LayoutModeProvider>
    </PersistedSidebarProvider>
  );
}
