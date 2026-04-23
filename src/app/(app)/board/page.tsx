import Link from "next/link";
import { db } from "@/lib/db";
import { DynamicIcon } from "@/components/dynamic-icon";
import { getTranslator } from "@/lib/i18n/server";

export default async function PublicBoardsPage() {
  const t = await getTranslator();
  const boards = await db.board.findMany({
    where: { isPublic: true },
    orderBy: [{ name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("board.publicTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("board.publicDesc")}</p>
      </div>

      {boards.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          {t("board.publicEmpty")}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/board/${b.slug}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition hover:bg-accent">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DynamicIcon
                  name={b.icon}
                  iconUrl={b.iconUrl}
                  className="size-5"
                />
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{b.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  /{b.slug}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
