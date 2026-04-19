import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { BoardView } from "@/components/dashboard/board-view";
import type { BoardRole, BoardWithContents } from "@/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { slug } = await params;

  const board = await db.board.findFirst({
    where: {
      slug,
      OR: [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
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
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!board) notFound();

  let boardRole: BoardRole = "viewer";
  if (board.userId === session.user.id) {
    boardRole = "owner";
  } else if (board.members[0]) {
    boardRole = board.members[0].role as BoardRole;
  }

  return <BoardView board={board as BoardWithContents} boardRole={boardRole} />;
}
