"use server";

import { revalidatePath, refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { BoardRole } from "@/types";

async function revalidateBoard(boardId: string) {
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { slug: true },
  });
  if (board) revalidatePath(`/board/${board.slug}`);
}

// ─── Board Access Helper ─────────────────────────────────────────────────────

async function getBoardRole(
  boardId: string,
  userId: string,
): Promise<BoardRole | null> {
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { userId: true },
  });
  if (!board) return null;
  if (board.userId === userId) return "owner";

  const member = await db.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { role: true },
  });
  if (!member) return null;
  return member.role as BoardRole;
}

async function requireBoardAccess(
  boardId: string,
  minRole: "viewer" | "editor" | "owner",
) {
  const { user } = await requireAuth();
  const role = await getBoardRole(boardId, user.id);
  if (!role) throw new Error("Board not found");

  const hierarchy: BoardRole[] = ["viewer", "editor", "owner"];
  if (hierarchy.indexOf(role) < hierarchy.indexOf(minRole)) {
    throw new Error("Insufficient permissions");
  }
  return { user, role };
}

function boardAccessWhere(userId: string) {
  return {
    OR: [{ userId }, { members: { some: { userId } } }],
  };
}

// ─── Board Actions ───────────────────────────────────────────────────────────

const iconUrlSchema = z
  .string()
  .refine((v) => v.startsWith("/uploads/") || /^https?:\/\//.test(v), {
    message: "Must be a URL or uploaded file path",
  })
  .nullable()
  .optional();

const boardSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Nur Kleinbuchstaben, Zahlen und Bindestriche",
    )
    .optional(),
  icon: z.string().default("layout-dashboard"),
  iconUrl: iconUrlSchema,
  isPublic: z.boolean().default(false),
});

export async function createBoard(data: z.infer<typeof boardSchema>) {
  const { user } = await requireAuth();
  const parsed = boardSchema.parse(data);

  const baseSlug = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 0;
  while (await db.board.findUnique({ where: { slug } })) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const maxOrder = await db.board.aggregate({
    where: { userId: user.id },
    _max: { order: true },
  });

  const board = await db.board.create({
    data: {
      ...parsed,
      iconUrl: parsed.iconUrl || null,
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
      userId: user.id,
    },
  });

  revalidatePath("/dashboard");
  refresh();
  return board;
}

export async function updateBoard(
  boardId: string,
  data: Partial<z.infer<typeof boardSchema>>,
) {
  await requireBoardAccess(boardId, "owner");

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  if (data.slug && data.slug !== board.slug) {
    const existing = await db.board.findUnique({
      where: { slug: data.slug },
    });
    if (existing && existing.id !== boardId) {
      throw new Error("Slug already in use");
    }
  }

  const updated = await db.board.update({
    where: { id: boardId },
    data,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/board/${board.slug}`);
  if (updated.slug !== board.slug) {
    revalidatePath(`/board/${updated.slug}`);
  }
  refresh();
  return updated;
}

export async function deleteBoard(boardId: string) {
  await requireBoardAccess(boardId, "owner");

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  await db.board.delete({ where: { id: boardId } });
  revalidatePath("/dashboard");
  refresh();
}

export async function getBoards() {
  const { user } = await requireAuth();
  return db.board.findMany({
    where: boardAccessWhere(user.id),
    orderBy: { order: "asc" },
  });
}

export async function getBoardWithContents(boardId: string) {
  const { user } = await requireAuth();
  return db.board.findFirst({
    where: { id: boardId, ...boardAccessWhere(user.id) },
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
    },
  });
}

export async function getPublicBoard(slug: string) {
  return db.board.findFirst({
    where: { slug, isPublic: true },
    include: {
      user: { select: { name: true, image: true } },
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
    },
  });
}

// ─── Category Actions ────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default("folder"),
  iconUrl: iconUrlSchema,
  color: z.string().default("#6366f1"),
  x: z.number().int().min(0).default(0).optional(),
  y: z.number().int().min(0).default(0).optional(),
  w: z.number().int().min(1).max(48).default(6).optional(),
  h: z.number().int().min(1).max(48).default(4).optional(),
  boardId: z.string(),
});

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const parsed = categorySchema.parse(data);
  await requireBoardAccess(parsed.boardId, "editor");

  const board = await db.board.findUnique({ where: { id: parsed.boardId } });
  if (!board) throw new Error("Board not found");

  const maxY = await db.category.aggregate({
    where: { boardId: parsed.boardId },
    _max: { y: true, h: true },
  });

  const category = await db.category.create({
    data: {
      ...parsed,
      iconUrl: parsed.iconUrl || null,
      x: parsed.x ?? 0,
      y: parsed.y ?? (maxY._max.y ?? 0) + (maxY._max.h ?? 0),
      w: parsed.w ?? 6,
      h: parsed.h ?? 4,
    },
  });

  revalidatePath(`/board/${board.slug}`);
  refresh();
  return category;
}

export async function updateCategory(
  categoryId: string,
  data: Partial<Omit<z.infer<typeof categorySchema>, "boardId">>,
) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) throw new Error("Category not found");
  await requireBoardAccess(category.boardId, "editor");

  const updated = await db.category.update({
    where: { id: categoryId },
    data,
  });

  await revalidateBoard(category.boardId);
  refresh();
  return updated;
}

export async function deleteCategory(categoryId: string) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) throw new Error("Category not found");
  await requireBoardAccess(category.boardId, "editor");

  await db.category.delete({ where: { id: categoryId } });
  await revalidateBoard(category.boardId);
  refresh();
}

// ─── Group Actions ───────────────────────────────────────────────────────────

const groupSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default("grid-3x3"),
  iconUrl: iconUrlSchema,
  bgColor: z.string().nullable().optional(),
  layout: z.enum(["grid", "list"]).default("grid").optional(),
  x: z.number().int().min(0).default(0).optional(),
  y: z.number().int().min(0).default(0).optional(),
  w: z.number().int().min(1).max(48).default(4).optional(),
  h: z.number().int().min(1).max(48).default(4).optional(),
  categoryId: z.string(),
});

export async function createGroup(data: z.infer<typeof groupSchema>) {
  const parsed = groupSchema.parse(data);
  const category = await db.category.findUnique({
    where: { id: parsed.categoryId },
    include: { board: true },
  });
  if (!category) throw new Error("Category not found");
  await requireBoardAccess(category.boardId, "editor");

  const maxY = await db.group.aggregate({
    where: { categoryId: parsed.categoryId },
    _max: { y: true, h: true },
  });

  const group = await db.group.create({
    data: {
      ...parsed,
      iconUrl: parsed.iconUrl || null,
      x: parsed.x ?? 0,
      y: parsed.y ?? (maxY._max.y ?? 0) + (maxY._max.h ?? 0),
      w: parsed.w ?? 4,
      h: parsed.h ?? 4,
    },
  });

  revalidatePath(`/board/${category.board.slug}`);
  refresh();
  return group;
}

export async function updateGroup(
  groupId: string,
  data: Partial<Omit<z.infer<typeof groupSchema>, "categoryId">>,
) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");

  const updated = await db.group.update({
    where: { id: groupId },
    data,
  });

  await revalidateBoard(group.category.boardId);
  refresh();
  return updated;
}

export async function deleteGroup(groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");

  await db.group.delete({ where: { id: groupId } });
  await revalidateBoard(group.category.boardId);
  refresh();
}

// ─── Tile Actions ────────────────────────────────────────────────────────────

const tileSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default("square"),
  iconUrl: iconUrlSchema,
  color: z.string().default("#6366f1"),
  bgColor: z.string().nullable().optional(),
  borderColor: z.string().nullable().optional(),
  borderMatchesBg: z.boolean().default(false),
  url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(500).optional(),
  statusCheck: z.boolean().default(false),
  size: z.enum(["small", "default", "large"]).default("default").optional(),
  x: z.number().int().min(0).default(0).optional(),
  y: z.number().int().min(0).default(0).optional(),
  groupId: z.string(),
});

export async function createTile(data: z.infer<typeof tileSchema>) {
  const parsed = tileSchema.parse(data);
  const group = await db.group.findUnique({
    where: { id: parsed.groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");

  const maxY = await db.tile.aggregate({
    where: { groupId: parsed.groupId },
    _max: { y: true },
  });

  const tile = await db.tile.create({
    data: {
      ...parsed,
      url: parsed.url || null,
      iconUrl: parsed.iconUrl || null,
      bgColor: parsed.bgColor || null,
      borderColor: parsed.borderColor || null,
      description: parsed.description || null,
      x: parsed.x ?? 0,
      y: parsed.y ?? (maxY._max.y ?? -1) + 1,
    },
  });

  await revalidateBoard(group.category.boardId);
  refresh();
  return tile;
}

export async function updateTile(
  tileId: string,
  data: Partial<Omit<z.infer<typeof tileSchema>, "groupId">>,
) {
  const tile = await db.tile.findUnique({
    where: { id: tileId },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");
  await requireBoardAccess(tile.group.category.boardId, "editor");

  const updated = await db.tile.update({
    where: { id: tileId },
    data: {
      ...data,
      url: data.url || null,
      iconUrl: data.iconUrl !== undefined ? data.iconUrl || null : undefined,
      bgColor: data.bgColor !== undefined ? data.bgColor || null : undefined,
      borderColor:
        data.borderColor !== undefined ? data.borderColor || null : undefined,
    },
  });

  await revalidateBoard(tile.group.category.boardId);
  refresh();
  return updated;
}

export async function deleteTile(tileId: string) {
  const tile = await db.tile.findUnique({
    where: { id: tileId },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");
  await requireBoardAccess(tile.group.category.boardId, "editor");

  await db.tile.delete({ where: { id: tileId } });
  await revalidateBoard(tile.group.category.boardId);
  refresh();
}

// ─── Layout Sync ─────────────────────────────────────────────────────────────

/** Batch layout sync: called on exit of edit mode. */
export async function syncBoardLayout(
  boardId: string,
  payload: {
    categories?: { id: string; x: number; y: number; w: number; h: number }[];
    groups?: { id: string; x: number; y: number; w: number; h: number }[];
    tiles?: { id: string; x: number; y: number; groupId?: string }[];
  },
) {
  await requireBoardAccess(boardId, "editor");

  const ops: Promise<unknown>[] = [];
  for (const c of payload.categories ?? []) {
    ops.push(
      db.category.update({
        where: { id: c.id },
        data: { x: c.x, y: c.y, w: c.w, h: c.h },
      }),
    );
  }
  for (const g of payload.groups ?? []) {
    ops.push(
      db.group.update({
        where: { id: g.id },
        data: { x: g.x, y: g.y, w: g.w, h: g.h },
      }),
    );
  }
  for (const t of payload.tiles ?? []) {
    const data: { x: number; y: number; groupId?: string } = {
      x: t.x,
      y: t.y,
    };
    if (t.groupId) data.groupId = t.groupId;
    ops.push(db.tile.update({ where: { id: t.id }, data }));
  }
  await Promise.all(ops);
  await revalidateBoard(boardId);
  refresh();
}

/** Move a tile to another group (position reset to 0,0 by default). */
export async function moveTileToGroup(
  tileId: string,
  newGroupId: string,
  x = 0,
  y = 0,
) {
  const tile = await db.tile.findUnique({
    where: { id: tileId },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");
  await requireBoardAccess(tile.group.category.boardId, "editor");

  const target = await db.group.findUnique({
    where: { id: newGroupId },
    include: { category: true },
  });
  if (!target) throw new Error("Target group not found");
  if (target.category.boardId !== tile.group.category.boardId) {
    throw new Error("Cannot move tile across boards");
  }

  await db.tile.update({
    where: { id: tileId },
    data: { groupId: newGroupId, x, y },
  });

  await revalidateBoard(tile.group.category.boardId);
  refresh();
}

/** Move a group to another category (position reset to 0,0 by default). */
export async function moveGroupToCategory(
  groupId: string,
  newCategoryId: string,
  x = 0,
  y = 0,
) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");

  const target = await db.category.findUnique({
    where: { id: newCategoryId },
  });
  if (!target) throw new Error("Target category not found");
  if (target.boardId !== group.category.boardId) {
    throw new Error("Cannot move group across boards");
  }

  await db.group.update({
    where: { id: groupId },
    data: { categoryId: newCategoryId, x, y },
  });

  await revalidateBoard(group.category.boardId);
  refresh();
}

// ─── Duplicate Actions ───────────────────────────────────────────────────────

export async function duplicateTile(tileId: string) {
  const tile = await db.tile.findUnique({
    where: { id: tileId },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");
  await requireBoardAccess(tile.group.category.boardId, "editor");

  const maxY = await db.tile.aggregate({
    where: { groupId: tile.groupId },
    _max: { y: true },
  });

  const copy = await db.tile.create({
    data: {
      name: `${tile.name} (Kopie)`,
      icon: tile.icon,
      iconUrl: tile.iconUrl,
      color: tile.color,
      bgColor: tile.bgColor,
      borderColor: tile.borderColor,
      borderMatchesBg: tile.borderMatchesBg,
      url: tile.url,
      description: tile.description,
      size: tile.size,
      x: 0,
      y: (maxY._max.y ?? -1) + 1,
      groupId: tile.groupId,
    },
  });

  await revalidateBoard(tile.group.category.boardId);
  refresh();
  return copy;
}

export async function duplicateGroup(groupId: string) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      category: true,
      tiles: { orderBy: [{ y: "asc" }, { x: "asc" }] },
    },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");

  const maxY = await db.group.aggregate({
    where: { categoryId: group.categoryId },
    _max: { y: true, h: true },
  });

  const copy = await db.group.create({
    data: {
      name: `${group.name} (Kopie)`,
      icon: group.icon,
      iconUrl: group.iconUrl,
      bgColor: group.bgColor,
      layout: group.layout,
      x: 0,
      y: (maxY._max.y ?? 0) + (maxY._max.h ?? 0),
      w: group.w,
      h: group.h,
      categoryId: group.categoryId,
      tiles: {
        create: group.tiles.map((tile) => ({
          name: tile.name,
          icon: tile.icon,
          iconUrl: tile.iconUrl,
          color: tile.color,
          bgColor: tile.bgColor,
          borderColor: tile.borderColor,
          borderMatchesBg: tile.borderMatchesBg,
          url: tile.url,
          description: tile.description,
          size: tile.size,
          x: tile.x,
          y: tile.y,
        })),
      },
    },
  });

  await revalidateBoard(group.category.boardId);
  refresh();
  return copy;
}

export async function duplicateCategory(categoryId: string) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      groups: {
        orderBy: [{ y: "asc" }, { x: "asc" }],
        include: { tiles: { orderBy: [{ y: "asc" }, { x: "asc" }] } },
      },
    },
  });
  if (!category) throw new Error("Category not found");
  await requireBoardAccess(category.boardId, "editor");

  const maxY = await db.category.aggregate({
    where: { boardId: category.boardId },
    _max: { y: true, h: true },
  });

  const copy = await db.category.create({
    data: {
      name: `${category.name} (Kopie)`,
      icon: category.icon,
      iconUrl: category.iconUrl,
      color: category.color,
      x: 0,
      y: (maxY._max.y ?? 0) + (maxY._max.h ?? 0),
      w: category.w,
      h: category.h,
      boardId: category.boardId,
      groups: {
        create: category.groups.map((group) => ({
          name: group.name,
          icon: group.icon,
          iconUrl: group.iconUrl,
          bgColor: group.bgColor,
          layout: group.layout,
          x: group.x,
          y: group.y,
          w: group.w,
          h: group.h,
          tiles: {
            create: group.tiles.map((tile) => ({
              name: tile.name,
              icon: tile.icon,
              iconUrl: tile.iconUrl,
              color: tile.color,
              bgColor: tile.bgColor,
              borderColor: tile.borderColor,
              borderMatchesBg: tile.borderMatchesBg,
              url: tile.url,
              description: tile.description,
              size: tile.size,
              x: tile.x,
              y: tile.y,
            })),
          },
        })),
      },
    },
  });

  await revalidateBoard(category.boardId);
  refresh();
  return copy;
}

export async function duplicateBoard(boardId: string) {
  const { user } = await requireAuth();
  await requireBoardAccess(boardId, "editor");

  const board = await db.board.findUnique({
    where: { id: boardId },
    include: {
      categories: {
        orderBy: [{ y: "asc" }, { x: "asc" }],
        include: {
          groups: {
            orderBy: [{ y: "asc" }, { x: "asc" }],
            include: { tiles: { orderBy: [{ y: "asc" }, { x: "asc" }] } },
          },
        },
      },
    },
  });
  if (!board) throw new Error("Board not found");

  const slug =
    board.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-kopie-" +
    Date.now().toString(36);

  const maxOrder = await db.board.aggregate({
    where: { userId: user.id },
    _max: { order: true },
  });

  const copy = await db.board.create({
    data: {
      name: `${board.name} (Kopie)`,
      slug,
      icon: board.icon,
      iconUrl: board.iconUrl,
      isPublic: false,
      order: (maxOrder._max.order ?? -1) + 1,
      userId: user.id,
      categories: {
        create: board.categories.map((cat) => ({
          name: cat.name,
          icon: cat.icon,
          iconUrl: cat.iconUrl,
          color: cat.color,
          x: cat.x,
          y: cat.y,
          w: cat.w,
          h: cat.h,
          groups: {
            create: cat.groups.map((group) => ({
              name: group.name,
              icon: group.icon,
              iconUrl: group.iconUrl,
              bgColor: group.bgColor,
              layout: group.layout,
              x: group.x,
              y: group.y,
              w: group.w,
              h: group.h,
              tiles: {
                create: group.tiles.map((tile) => ({
                  name: tile.name,
                  icon: tile.icon,
                  iconUrl: tile.iconUrl,
                  color: tile.color,
                  bgColor: tile.bgColor,
                  borderColor: tile.borderColor,
                  borderMatchesBg: tile.borderMatchesBg,
                  url: tile.url,
                  description: tile.description,
                  size: tile.size,
                  x: tile.x,
                  y: tile.y,
                })),
              },
            })),
          },
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  refresh();
  return copy;
}

// ─── Board Member Actions ────────────────────────────────────────────────────

export async function getUserBoardRole(
  boardId: string,
): Promise<BoardRole | null> {
  const { user } = await requireAuth();
  return getBoardRole(boardId, user.id);
}

export async function getBoardMembers(boardId: string) {
  await requireBoardAccess(boardId, "owner");

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: {
      userId: true,
      user: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { role: "asc" },
      },
    },
  });
  if (!board) throw new Error("Board not found");
  return { owner: board.user, members: board.members };
}

export async function addBoardMember(
  boardId: string,
  userId: string,
  role: "viewer" | "editor",
) {
  await requireBoardAccess(boardId, "owner");

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("Benutzer nicht gefunden");

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");
  if (board.userId === targetUser.id) {
    throw new Error("Der Besitzer kann nicht als Mitglied hinzugefügt werden");
  }

  const existing = await db.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: targetUser.id } },
  });
  if (existing) throw new Error("Benutzer ist bereits Mitglied");

  const member = await db.boardMember.create({
    data: { boardId, userId: targetUser.id, role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await revalidateBoard(boardId);
  refresh();
  return member;
}

export async function updateBoardMemberRole(
  memberId: string,
  role: "viewer" | "editor",
) {
  const member = await db.boardMember.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Mitglied nicht gefunden");
  await requireBoardAccess(member.boardId, "owner");

  const updated = await db.boardMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await revalidateBoard(member.boardId);
  refresh();
  return updated;
}

export async function removeBoardMember(memberId: string) {
  const member = await db.boardMember.findUnique({ where: { id: memberId } });
  if (!member) throw new Error("Mitglied nicht gefunden");
  await requireBoardAccess(member.boardId, "owner");

  await db.boardMember.delete({ where: { id: memberId } });
  await revalidateBoard(member.boardId);
  refresh();
}

export async function getAvailableUsersForBoard(boardId: string) {
  await requireBoardAccess(boardId, "owner");

  const board = await db.board.findUnique({
    where: { id: boardId },
    select: {
      userId: true,
      members: { select: { userId: true } },
    },
  });
  if (!board) throw new Error("Board not found");

  const excludeIds = [board.userId, ...board.members.map((m) => m.userId)];

  return db.user.findMany({
    where: { id: { notIn: excludeIds } },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });
}

// ─── Reorder Actions ─────────────────────────────────────────────────────────

export async function reorderCategories(boardId: string, orderedIds: string[]) {
  await requireBoardAccess(boardId, "editor");
  await db.$transaction(
    orderedIds.map((id, i) =>
      db.category.update({ where: { id }, data: { y: i, x: 0 } }),
    ),
  );
  await revalidateBoard(boardId);
  refresh();
}

export async function reorderGroups(categoryId: string, orderedIds: string[]) {
  const cat = await db.category.findUnique({ where: { id: categoryId } });
  if (!cat) throw new Error("Category not found");
  await requireBoardAccess(cat.boardId, "editor");
  await db.$transaction(
    orderedIds.map((id, i) =>
      db.group.update({ where: { id }, data: { y: i, x: 0 } }),
    ),
  );
  await revalidateBoard(cat.boardId);
  refresh();
}

export async function reorderTiles(groupId: string, orderedIds: string[]) {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");
  await db.$transaction(
    orderedIds.map((id, i) =>
      db.tile.update({ where: { id }, data: { y: i, x: 0 } }),
    ),
  );
  await revalidateBoard(group.category.boardId);
  refresh();
}

export async function setCategoryWidth(categoryId: string, width: number) {
  if (![1, 2, 3, 4].includes(width)) throw new Error("Invalid width");
  const category = await db.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) throw new Error("Category not found");
  await requireBoardAccess(category.boardId, "editor");
  await db.category.update({ where: { id: categoryId }, data: { w: width } });
  await revalidateBoard(category.boardId);
  refresh();
}
