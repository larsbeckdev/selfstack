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

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const boards = await db.board.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: { categories: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen zurück, {session.user.name}
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
                        {board._count.categories} Kategorien
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={board.isPublic ? "default" : "secondary"}>
                    {board.isPublic ? (
                      <Globe className="mr-1 size-3" />
                    ) : (
                      <Lock className="mr-1 size-3" />
                    )}
                    {board.isPublic ? "Öffentlich" : "Privat"}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}

        {boards.length === 0 && (
          <Card className="col-span-full">
            <CardHeader className="text-center">
              <CardTitle>Keine Boards vorhanden</CardTitle>
              <CardDescription>
                Erstelle dein erstes Board über die Sidebar oder den + Button
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
