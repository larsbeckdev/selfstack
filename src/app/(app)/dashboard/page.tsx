import type { Prisma } from "@/generated/prisma/client";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  canDeleteAnyOrgBoard,
  canDeleteOthersBoards,
  canViewAllBoards,
  canViewBoards,
} from "@/lib/permissions";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Globe, Lock, Building2, User as UserIcon } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteBoardButton } from "@/components/dashboard/delete-board-button";
import { getLocale, getTranslator } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const t = await getTranslator();
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const role = session.user.role;

  // Mirrors `boardAccessWhere` in board actions.
  let where: Prisma.BoardWhereInput;
  if (!canViewBoards(role)) {
    // Guests see no boards.
    where = { id: "__none__" };
  } else if (canViewAllBoards(role)) {
    where = {};
  } else {
    // Viewer/member/editor: own + explicitly shared + org-boards of orgs
    // they belong to. Editors do NOT see boards of orgs they aren’t in.
    where = {
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
    where,
    orderBy: { order: "asc" },
    include: {
      _count: { select: { categories: true } },
      organization: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, username: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("dashboard.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("dashboard.welcomeBack")}, {session.user.name}
        </p>
      </div>

      {boards.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("dashboard.noBoardsTitle")}</CardTitle>
            <CardDescription>{t("dashboard.noBoardsDesc")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dashboard.col.board")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("dashboard.col.owner")}
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("dashboard.col.scope")}
                </TableHead>
                <TableHead className="hidden lg:table-cell text-right">
                  {t("public.categories")}
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  {t("dashboard.col.updated")}
                </TableHead>
                <TableHead className="text-right">
                  {t("dashboard.col.visibility")}
                </TableHead>
                <TableHead className="w-[1%] text-right">
                  <span className="sr-only">{t("dashboard.col.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boards.map((board) => {
                const isOwn = board.userId === session.user.id;
                const ownerLabel = isOwn
                  ? t("dashboard.ownerYou")
                  : (board.user?.name ?? "—");
                const isOrgBoard = !!board.orgId;
                const canDelete =
                  isOwn ||
                  (isOrgBoard && canDeleteAnyOrgBoard(role)) ||
                  (!isOrgBoard && canDeleteOthersBoards(role));
                return (
                  <TableRow key={board.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/board/${board.slug}`}
                        className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <DynamicIcon name={board.icon} className="size-4" />
                        </span>
                        <span className="min-w-0 truncate">{board.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <UserIcon className="size-3.5" />
                        {ownerLabel}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {board.organization ? (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="size-3" />
                          {board.organization.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {t("dashboard.scopePersonal")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-muted-foreground">
                      {board._count.categories}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground tabular-nums">
                      {dateFmt.format(board.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={board.isPublic ? "default" : "secondary"}>
                        {board.isPublic ? (
                          <Globe className="mr-1 size-3" />
                        ) : (
                          <Lock className="mr-1 size-3" />
                        )}
                        {board.isPublic
                          ? t("common.public")
                          : t("common.private")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {canDelete && (
                        <DeleteBoardButton
                          boardId={board.id}
                          boardName={board.name}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
