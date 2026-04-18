import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Force password change if required
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  if (user?.mustChangePassword) redirect("/change-password");

  const boards = await db.board.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  });

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={session.user} boards={boards} />
        <SidebarInset>
          <AppHeader user={session.user} />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
