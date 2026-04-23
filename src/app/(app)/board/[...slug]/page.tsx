import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { BoardView } from "@/components/dashboard/board-view";
import type { BoardRole, BoardWithContents } from "@/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug: slugParts } = await params;
  const slug = slugParts.join("/");
  const session = await getSession();

  // Unauthenticated visitors: only public boards are viewable (readonly).
  if (!session) {
    const publicBoard = await db.board.findFirst({
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
    if (!publicBoard) notFound();
    return <BoardView board={publicBoard as BoardWithContents} forceReadonly />;
  }

  const isPrivileged =
    session.user.role === "admin" || session.user.role === "editor";

  const board = await db.board.findFirst({
    where: isPrivileged
      ? { slug }
      : {
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

  // Logged-in user without board access: fall back to readonly public view
  // if the board happens to be public, otherwise 404.
  if (!board) {
    const publicBoard = await db.board.findFirst({
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
    if (!publicBoard) notFound();
    return <BoardView board={publicBoard as BoardWithContents} forceReadonly />;
  }

  let boardRole: BoardRole = "viewer";
  if (board.userId === session.user.id) {
    boardRole = "owner";
  } else if (board.members[0]) {
    boardRole = board.members[0].role as BoardRole;
  } else if (session.user.role === "admin") {
    boardRole = "owner";
  } else if (session.user.role === "editor") {
    boardRole = "editor";
  }

  return <BoardView board={board as BoardWithContents} boardRole={boardRole} />;
}
