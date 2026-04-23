import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Globe, Lock } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTranslator } from "@/lib/i18n/server";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const t = await getTranslator();

  const role = session.user.role;
  const boards = await db.board.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
        role === "editor"
          ? { orgId: { not: null } }
          : {
              organization: {
                is: { members: { some: { userId: session.user.id } } },
              },
            },
      ],
    },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { categories: true },
      },
      organization: { select: { id: true, name: true, slug: true } },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <Link key={board.id} href={`/board/${board.slug}`}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DynamicIcon name={board.icon} className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{board.name}</CardTitle>
                      <CardDescription>
                        {board._count.categories} {t("public.categories")}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={board.isPublic ? "default" : "secondary"}>
                    {board.isPublic ? (
                      <Globe className="mr-1 size-3" />
                    ) : (
                      <Lock className="mr-1 size-3" />
                    )}
                    {board.isPublic ? t("common.public") : t("common.private")}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}

        {boards.length === 0 && (
          <Card className="col-span-full">
            <CardHeader className="text-center">
              <CardTitle>{t("dashboard.noBoardsTitle")}</CardTitle>
              <CardDescription>{t("dashboard.noBoardsDesc")}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
