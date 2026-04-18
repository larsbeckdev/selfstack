import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { DynamicIcon } from "@/components/dynamic-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Layers, LogIn } from "lucide-react";

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const board = await db.board.findFirst({
    where: { slug, isPublic: true },
    include: {
      user: { select: { name: true } },
      categories: {
        orderBy: { order: "asc" },
        include: {
          groups: {
            orderBy: { order: "asc" },
            include: {
              tiles: { orderBy: { order: "asc" } },
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

      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <DynamicIcon name={board.icon} className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{board.name}</h1>
            <p className="text-sm text-muted-foreground">
              von {board.user.name}
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto">
            <Globe className="mr-1 size-3" />
            Öffentlich
          </Badge>
        </div>

        <div className="space-y-6">
          {board.categories.map((category) => (
            <div
              key={category.id}
              className="rounded-lg border bg-card"
              style={{ borderLeftColor: category.color, borderLeftWidth: 4 }}>
              <div className="flex items-center gap-2 px-4 py-3">
                <DynamicIcon
                  name={category.icon}
                  className="size-4"
                  style={{ color: category.color }}
                />
                <h2 className="text-sm font-semibold">{category.name}</h2>
              </div>
              <div className="space-y-3 px-4 pb-4">
                {category.groups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-md border bg-background">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                      <DynamicIcon
                        name={group.icon}
                        className="size-3.5 text-muted-foreground"
                      />
                      <h3 className="text-xs font-medium">{group.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 p-3">
                      {group.tiles.map((tile) => (
                        <a
                          key={tile.id}
                          href={tile.url ?? undefined}
                          target={tile.url ? "_blank" : undefined}
                          rel={tile.url ? "noopener noreferrer" : undefined}
                          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors hover:brightness-110"
                          style={{
                            borderColor: tile.borderMatchesBg
                              ? tile.bgColor || tile.color + "40"
                              : tile.borderColor || tile.color + "40",
                            backgroundColor: tile.bgColor || undefined,
                          }}>
                          <DynamicIcon
                            name={tile.icon}
                            className="size-6"
                            style={{ color: tile.color }}
                          />
                          <span className="max-w-full truncate text-[10px] font-medium">
                            {tile.name}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
