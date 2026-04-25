import type { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canEditAnyOrgBoard,
  canViewAllBoards,
  canViewBoards,
} from "@/lib/permissions";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { PersistedSidebarProvider } from "@/components/layout/persisted-sidebar-provider";
import { LayoutModeProvider } from "@/components/layout/layout-mode-provider";
import { LayoutModeMain } from "@/components/layout/layout-mode-toggle";
import { BoardTitleProvider } from "@/components/layout/board-title-provider";
import { PublicShell } from "@/components/layout/public-shell";
import { AppFooter } from "@/components/layout/app-footer";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Unauthenticated users get a minimal public shell. Individual pages inside
  // this layout are responsible for redirecting to /login if they require a
  // session. Unauthenticated visitors can reach /board and /board/<slug>
  // (for public boards).
  if (!session) {
    return (
      <BoardTitleProvider>
        <PublicShell>{children}</PublicShell>
      </BoardTitleProvider>
    );
  }

  // Force password change if required
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true, sidebarOpen: true },
  });
  if (user?.mustChangePassword) redirect("/change-password");

  // Sidebar shows boards the user personally works with:
  // - Own boards + boards they're a member of
  // - Boards of organizations they belong to
  // - Global editors additionally see all org boards
  // Admins/superadmins do NOT see every board here — they manage other
  // users' boards through the admin UI instead, keeping the sidebar focused
  // on "my" boards.
  // Guests have no boards at all.
  const role = session.user.role;
  let boardWhere: Prisma.BoardWhereInput;
  if (!canViewBoards(role)) {
    boardWhere = { id: "__none__" };
  } else if (canViewAllBoards(role)) {
    // Even though admins technically can see everything, keep the sidebar
    // focused on boards they personally interact with.
    boardWhere = {
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
        {
          organization: {
            is: { members: { some: { userId: session.user.id } } },
          },
        },
      ],
    };
  } else if (canEditAnyOrgBoard(role)) {
    boardWhere = {
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
        { orgId: { not: null } },
      ],
    };
  } else {
    boardWhere = {
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
        {
          organization: {
            is: { members: { some: { userId: session.user.id } } },
          },
        },
      ],
    };
  }

  const boards = await db.board.findMany({
    where: boardWhere,
    orderBy: { order: "asc" },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return (
    <BoardTitleProvider>
      <PersistedSidebarProvider defaultOpen={user?.sidebarOpen ?? true}>
        <LayoutModeProvider>
          <AppSidebar user={session.user} boards={boards} />
          <SidebarInset>
            <AppHeader user={session.user} />
            <LayoutModeMain>{children}</LayoutModeMain>
            <AppFooter />
          </SidebarInset>
        </LayoutModeProvider>
      </PersistedSidebarProvider>
    </BoardTitleProvider>
  );
}
