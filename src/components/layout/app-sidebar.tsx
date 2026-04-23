"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Shield,
  Plus,
  Layers,
  Image as ImageIcon,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Settings2,
} from "lucide-react";
import { DynamicIcon } from "@/components/dynamic-icon";
import { useTranslation } from "@/components/locale-provider";
import type { SessionUser } from "@/types";
import type { Board } from "@/generated/prisma/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateBoardDialog } from "@/components/dashboard/create-board-dialog";
import { useBoardTitle } from "@/components/layout/board-title-provider";
import { copyToClipboard } from "@/lib/clipboard";
import { toast } from "sonner";

export function AppSidebar({
  user,
  boards,
}: {
  user: SessionUser;
  boards: Board[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const boardTitleCtx = useBoardTitle();
  const boardTitle = boardTitleCtx?.boardTitle ?? null;
  const { isMobile, setOpenMobile } = useSidebar();

  // Auto-close mobile sidebar sheet when the route changes.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const copyBoardLink = async (board: Board) => {
    const path = `/board/${board.slug}`;
    const url = `${window.location.origin}${path}`;
    const ok = await copyToClipboard(url);
    if (ok) toast.success(t("common.linkCopied"));
    else toast.error(t("common.copyFailed"));
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Layers className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Selfstack</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {boardTitle ?? t("nav.dashboard")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {t("nav.boards")}
            <CreateBoardDialog>
              <button className="rounded-md p-0.5 hover:bg-accent">
                <Plus className="size-3.5" />
              </button>
            </CreateBoardDialog>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {boards.map((board) => (
                <SidebarMenuItem key={board.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/board/${board.slug}`}>
                    <Link href={`/board/${board.slug}`}>
                      <DynamicIcon
                        name={board.icon}
                        iconUrl={board.iconUrl}
                        className="size-4"
                      />
                      <span>{board.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal className="size-4" />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      className="min-w-48">
                      <DropdownMenuItem
                        onClick={() => router.push(`/board/${board.slug}`)}>
                        <ExternalLink className="mr-2 size-4" />
                        {t("common.open")}
                      </DropdownMenuItem>
                      {board.isPublic && (
                        <DropdownMenuItem onClick={() => copyBoardLink(board)}>
                          <Copy className="mr-2 size-4" />
                          {t("common.copy")} {t("common.link").toLowerCase()}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/board/${board.slug}?settings=true`)
                        }>
                        <Settings2 className="mr-2 size-4" />
                        {t("nav.settings")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
              {boards.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  {t("nav.noBoards")}
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.dashboard")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-4" />
                    <span>{t("nav.dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/media"}>
                  <Link href="/media">
                    <ImageIcon className="size-4" />
                    <span>{t("nav.media")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/settings")}>
                  <Link href="/settings">
                    <Settings className="size-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith("/admin")}>
                    <Link href="/admin">
                      <Shield className="size-4" />
                      <span>{t("nav.admin")}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
