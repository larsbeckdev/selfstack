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
  const { slug } = await params;
  const session = await getSession();

  if (!session) {
    const publicBoard = await db.board.findFirst({
      where: { slug, isPublic: true },
      select: { id: true },
    });
    if (publicBoard) redirect(`/b/${slug}`);
    redirect(`/login?redirect=/board/${slug}`);
  }

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
        orderBy: [{ y: "asc" }, { x: "asc" }],
        include: {
          groups: {
            orderBy: [{ y: "asc" }, { x: "asc" }],
            include: {
              tiles: {
                orderBy: [{ y: "asc" }, { x: "asc" }],
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

  if (!board) {
    const publicBoard = await db.board.findFirst({
      where: { slug, isPublic: true },
      select: { id: true },
    });
    if (publicBoard) redirect(`/b/${slug}`);
    notFound();
  }

  let boardRole: BoardRole = "viewer";
  if (board.userId === session.user.id) {
    boardRole = "owner";
  } else if (board.members[0]) {
    boardRole = board.members[0].role as BoardRole;
  }

  return <BoardView board={board as BoardWithContents} boardRole={boardRole} />;
}
