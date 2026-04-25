import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canEditAnyOrgBoard,
  canViewAllBoards,
  canViewBoards,
} from "@/lib/permissions";
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

  const isAllSeeing = canViewAllBoards(session.user.role);
  const isOrgEditor = canEditAnyOrgBoard(session.user.role);

  // Build the same access filter as `boardAccessWhere` in board actions.
  // Guests cannot access any board through this route; fall through to
  // the public-board fallback below.
  const accessOr = canViewBoards(session.user.role)
    ? [
        { userId: session.user.id },
        { members: { some: { userId: session.user.id } } },
        ...(isOrgEditor
          ? [{ orgId: { not: null } as const }]
          : [
              {
                organization: {
                  is: { members: { some: { userId: session.user.id } } },
                },
              } as const,
            ]),
      ]
    : null;

  const board = await db.board.findFirst({
    where: isAllSeeing
      ? { slug }
      : accessOr
        ? { slug, OR: accessOr }
        : { id: "__none__" }, // guest
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
  } else if (isAllSeeing) {
    boardRole = "owner";
  } else if (isOrgEditor && board.orgId) {
    boardRole = "editor";
  }

  return <BoardView board={board as BoardWithContents} boardRole={boardRole} />;
}
