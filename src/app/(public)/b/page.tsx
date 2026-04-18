import Link from "next/link";
import { Layers, Globe, ArrowRight, LogIn } from "lucide-react";
import { db } from "@/lib/db";
import { DynamicIcon } from "@/components/dynamic-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function PublicBoardsPage() {
  const boards = await db.board.findMany({
    where: { isPublic: true },
    include: {
      user: { select: { name: true } },
      _count: { select: { categories: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-svh">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/b" className="flex items-center gap-2 font-semibold">
            <Layers className="size-5 text-primary" />
            Selfstack
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">
                <LogIn className="mr-2 size-4" />
                Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Globe className="size-6 text-primary" />
            Public Boards
          </h1>
          <p className="text-muted-foreground">
            Discover publicly shared dashboards
          </p>
        </div>

        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <Globe className="mb-4 size-12 text-muted-foreground/50" />
            <h2 className="text-lg font-medium">No public boards available</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no publicly shared boards yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((board: (typeof boards)[number]) => (
              <Card key={board.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <DynamicIcon
                        name={board.icon}
                        iconUrl={board.iconUrl}
                        className="size-5 text-primary"
                      />
                      <CardTitle className="text-base">{board.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-3">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{board.user.name}</span>
                    <span>·</span>
                    <span>
                      {board._count.categories}{" "}
                      {board._count.categories === 1
                        ? "Category"
                        : "Categories"}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild>
                    <Link href={`/b/${board.slug}`}>
                      View Board
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
