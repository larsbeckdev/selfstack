import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import type { BoardWithContents } from "@/types";
import { BoardView } from "@/components/dashboard/board-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Layers, LogIn } from "lucide-react";
import { getTranslator } from "@/lib/i18n/server";

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslator();

  const board = await db.board.findFirst({
    where: { slug, isPublic: true },
    include: {
      categories: {
        orderBy: [{ y: "asc" }, { x: "asc" }],
        include: {
          groups: {
            orderBy: [{ y: "asc" }, { x: "asc" }],
            include: {
              tiles: { orderBy: [{ y: "asc" }, { x: "asc" }] },
            },
          },
        },
      },
    },
  });

  if (!board) notFound();

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

      <div className="mx-auto max-w-7xl p-6">
        <BoardView board={board as BoardWithContents} forceReadonly />
      </div>
    </div>
  );
}
