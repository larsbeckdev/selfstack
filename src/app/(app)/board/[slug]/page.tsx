import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { BoardView } from "@/components/dashboard/board-view";
import type { BoardWithContents } from "@/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;

  const board = await db.board.findFirst({
    where: { slug, userId: session.user.id },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          groups: {
            orderBy: { order: "asc" },
            include: {
              tiles: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!board) notFound();

  return <BoardView board={board as BoardWithContents} />;
}
