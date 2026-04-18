"use server";

import { revalidatePath, refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

async function revalidateBoard(boardId: string) {
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { slug: true },
  });
  if (board) revalidatePath(`/board/${board.slug}`);
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
  icon: z.string().default("layout-dashboard"),
  iconUrl: iconUrlSchema,
  isPublic: z.boolean().default(false),
});

export async function createBoard(data: z.infer<typeof boardSchema>) {
  const { user } = await requireAuth();
  const parsed = boardSchema.parse(data);

  const slug =
    parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);

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
  const { user } = await requireAuth();

  const board = await db.board.findFirst({
    where: { id: boardId, userId: user.id },
  });
  if (!board) throw new Error("Board not found");

  const updated = await db.board.update({
    where: { id: boardId },
    data,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/board/${board.slug}`);
  refresh();
  return updated;
}

export async function deleteBoard(boardId: string) {
  const { user } = await requireAuth();

  const board = await db.board.findFirst({
    where: { id: boardId, userId: user.id },
  });
  if (!board) throw new Error("Board not found");

  await db.board.delete({ where: { id: boardId } });
  revalidatePath("/dashboard");
  refresh();
}

export async function getBoards() {
  const { user } = await requireAuth();
  return db.board.findMany({
    where: { userId: user.id },
    orderBy: { order: "asc" },
  });
}

export async function getBoardWithContents(boardId: string) {
  const { user } = await requireAuth();
  return db.board.findFirst({
    where: { id: boardId, userId: user.id },
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
}

export async function getPublicBoard(slug: string) {
  return db.board.findFirst({
    where: { slug, isPublic: true },
    include: {
      user: { select: { name: true, image: true } },
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
}

// ─── Category Actions ────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default("folder"),
  iconUrl: iconUrlSchema,
  color: z.string().default("#6366f1"),
  boardId: z.string(),
});

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const { user } = await requireAuth();

  const board = await db.board.findFirst({
    where: { id: data.boardId, userId: user.id },
  });
  if (!board) throw new Error("Board not found");

  const maxOrder = await db.category.aggregate({
    where: { boardId: data.boardId },
    _max: { order: true },
  });

  const category = await db.category.create({
    data: {
      ...data,
      iconUrl: data.iconUrl || null,
      order: (maxOrder._max.order ?? -1) + 1,
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
  const { user } = await requireAuth();

  const category = await db.category.findFirst({
    where: { id: categoryId, board: { userId: user.id } },
  });
  if (!category) throw new Error("Category not found");

  const updated = await db.category.update({
    where: { id: categoryId },
    data,
  });

  await revalidateBoard(category.boardId);
  refresh();
  return updated;
}

export async function deleteCategory(categoryId: string) {
  const { user } = await requireAuth();

  const category = await db.category.findFirst({
    where: { id: categoryId, board: { userId: user.id } },
  });
  if (!category) throw new Error("Category not found");

  await db.category.delete({ where: { id: categoryId } });
  await revalidateBoard(category.boardId);
  refresh();
}

// ─── Group Actions ───────────────────────────────────────────────────────────

const groupSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().default("grid-3x3"),
  iconUrl: iconUrlSchema,
  viewMode: z
    .enum(["grid", "grid-sm", "grid-lg", "list"])
    .default("grid")
    .optional(),
  categoryId: z.string(),
});

export async function createGroup(data: z.infer<typeof groupSchema>) {
  const { user } = await requireAuth();

  const category = await db.category.findFirst({
    where: { id: data.categoryId, board: { userId: user.id } },
    include: { board: true },
  });
  if (!category) throw new Error("Category not found");

  const maxOrder = await db.group.aggregate({
    where: { categoryId: data.categoryId },
    _max: { order: true },
  });

  const group = await db.group.create({
    data: {
      ...data,
      iconUrl: data.iconUrl || null,
      order: (maxOrder._max.order ?? -1) + 1,
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
  const { user } = await requireAuth();

  const group = await db.group.findFirst({
    where: { id: groupId, category: { board: { userId: user.id } } },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");

  const updated = await db.group.update({
    where: { id: groupId },
    data,
  });

  await revalidateBoard(group.category.boardId);
  refresh();
  return updated;
}

export async function deleteGroup(groupId: string) {
  const { user } = await requireAuth();

  const group = await db.group.findFirst({
    where: { id: groupId, category: { board: { userId: user.id } } },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");

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
  groupId: z.string(),
});

export async function createTile(data: z.infer<typeof tileSchema>) {
  const { user } = await requireAuth();

  const group = await db.group.findFirst({
    where: { id: data.groupId, category: { board: { userId: user.id } } },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");

  const maxOrder = await db.tile.aggregate({
    where: { groupId: data.groupId },
    _max: { order: true },
  });

  const tile = await db.tile.create({
    data: {
      ...data,
      url: data.url || null,
      iconUrl: data.iconUrl || null,
      bgColor: data.bgColor || null,
      borderColor: data.borderColor || null,
      description: data.description || null,
      order: (maxOrder._max.order ?? -1) + 1,
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
  const { user } = await requireAuth();

  const tile = await db.tile.findFirst({
    where: {
      id: tileId,
      group: { category: { board: { userId: user.id } } },
    },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");

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
  const { user } = await requireAuth();

  const tile = await db.tile.findFirst({
    where: {
      id: tileId,
      group: { category: { board: { userId: user.id } } },
    },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");

  await db.tile.delete({ where: { id: tileId } });
  await revalidateBoard(tile.group.category.boardId);
  refresh();
}

// ─── Reorder Actions ─────────────────────────────────────────────────────────

export async function reorderCategories(
  boardId: string,
  categoryIds: string[],
) {
  const { user } = await requireAuth();

  const board = await db.board.findFirst({
    where: { id: boardId, userId: user.id },
  });
  if (!board) throw new Error("Board not found");

  await Promise.all(
    categoryIds.map((id, index) =>
      db.category.update({ where: { id }, data: { order: index } }),
    ),
  );

  await revalidateBoard(boardId);
  refresh();
}

export async function reorderGroups(categoryId: string, groupIds: string[]) {
  const { user } = await requireAuth();

  const category = await db.category.findFirst({
    where: { id: categoryId, board: { userId: user.id } },
    include: { board: true },
  });
  if (!category) throw new Error("Category not found");

  await Promise.all(
    groupIds.map((id, index) =>
      db.group.update({ where: { id }, data: { order: index } }),
    ),
  );

  await revalidateBoard(category.boardId);
  refresh();
}

export async function reorderTiles(groupId: string, tileIds: string[]) {
  const { user } = await requireAuth();

  const group = await db.group.findFirst({
    where: { id: groupId, category: { board: { userId: user.id } } },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");

  await Promise.all(
    tileIds.map((id, index) =>
      db.tile.update({ where: { id }, data: { order: index } }),
    ),
  );

  await revalidateBoard(group.category.boardId);
  refresh();
}

export async function moveTileToGroup(tileId: string, newGroupId: string) {
  const { user } = await requireAuth();

  const tile = await db.tile.findFirst({
    where: {
      id: tileId,
      group: { category: { board: { userId: user.id } } },
    },
  });
  if (!tile) throw new Error("Tile not found");

  const newGroup = await db.group.findFirst({
    where: { id: newGroupId, category: { board: { userId: user.id } } },
    include: { category: true },
  });
  if (!newGroup) throw new Error("Target group not found");

  const maxOrder = await db.tile.aggregate({
    where: { groupId: newGroupId },
    _max: { order: true },
  });

  await db.tile.update({
    where: { id: tileId },
    data: {
      groupId: newGroupId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await revalidateBoard(newGroup.category.boardId);
  refresh();
}

export async function moveGroupToCategory(
  groupId: string,
  newCategoryId: string,
) {
  const { user } = await requireAuth();

  const group = await db.group.findFirst({
    where: { id: groupId, category: { board: { userId: user.id } } },
  });
  if (!group) throw new Error("Group not found");

  const newCategory = await db.category.findFirst({
    where: { id: newCategoryId, board: { userId: user.id } },
  });
  if (!newCategory) throw new Error("Target category not found");

  const maxOrder = await db.group.aggregate({
    where: { categoryId: newCategoryId },
    _max: { order: true },
  });

  await db.group.update({
    where: { id: groupId },
    data: {
      categoryId: newCategoryId,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  await revalidateBoard(newCategory.boardId);
  refresh();
}

// ─── Duplicate Actions ───────────────────────────────────────────────────────

export async function duplicateTile(tileId: string) {
  const { user } = await requireAuth();

  const tile = await db.tile.findFirst({
    where: {
      id: tileId,
      group: { category: { board: { userId: user.id } } },
    },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");

  const maxOrder = await db.tile.aggregate({
    where: { groupId: tile.groupId },
    _max: { order: true },
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
      order: (maxOrder._max.order ?? -1) + 1,
      groupId: tile.groupId,
    },
  });

  await revalidateBoard(tile.group.category.boardId);
  refresh();
  return copy;
}

export async function duplicateGroup(groupId: string) {
  const { user } = await requireAuth();

  const group = await db.group.findFirst({
    where: { id: groupId, category: { board: { userId: user.id } } },
    include: { category: true, tiles: { orderBy: { order: "asc" } } },
  });
  if (!group) throw new Error("Group not found");

  const maxOrder = await db.group.aggregate({
    where: { categoryId: group.categoryId },
    _max: { order: true },
  });

  const copy = await db.group.create({
    data: {
      name: `${group.name} (Kopie)`,
      icon: group.icon,
      iconUrl: group.iconUrl,
      viewMode: group.viewMode,
      order: (maxOrder._max.order ?? -1) + 1,
      categoryId: group.categoryId,
      tiles: {
        create: group.tiles.map((tile, i) => ({
          name: tile.name,
          icon: tile.icon,
          iconUrl: tile.iconUrl,
          color: tile.color,
          bgColor: tile.bgColor,
          borderColor: tile.borderColor,
          borderMatchesBg: tile.borderMatchesBg,
          url: tile.url,
          description: tile.description,
          order: i,
        })),
      },
    },
  });

  await revalidateBoard(group.category.boardId);
  refresh();
  return copy;
}

export async function duplicateCategory(categoryId: string) {
  const { user } = await requireAuth();

  const category = await db.category.findFirst({
    where: { id: categoryId, board: { userId: user.id } },
    include: {
      groups: {
        orderBy: { order: "asc" },
        include: { tiles: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!category) throw new Error("Category not found");

  const maxOrder = await db.category.aggregate({
    where: { boardId: category.boardId },
    _max: { order: true },
  });

  const copy = await db.category.create({
    data: {
      name: `${category.name} (Kopie)`,
      icon: category.icon,
      iconUrl: category.iconUrl,
      color: category.color,
      order: (maxOrder._max.order ?? -1) + 1,
      boardId: category.boardId,
      groups: {
        create: category.groups.map((group, gi) => ({
          name: group.name,
          icon: group.icon,
          iconUrl: group.iconUrl,
          viewMode: group.viewMode,
          order: gi,
          tiles: {
            create: group.tiles.map((tile, ti) => ({
              name: tile.name,
              icon: tile.icon,
              iconUrl: tile.iconUrl,
              color: tile.color,
              bgColor: tile.bgColor,
              borderColor: tile.borderColor,
              borderMatchesBg: tile.borderMatchesBg,
              url: tile.url,
              description: tile.description,
              order: ti,
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

  const board = await db.board.findFirst({
    where: { id: boardId, userId: user.id },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          groups: {
            orderBy: { order: "asc" },
            include: { tiles: { orderBy: { order: "asc" } } },
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
        create: board.categories.map((cat, ci) => ({
          name: cat.name,
          icon: cat.icon,
          iconUrl: cat.iconUrl,
          color: cat.color,
          order: ci,
          groups: {
            create: cat.groups.map((group, gi) => ({
              name: group.name,
              icon: group.icon,
              iconUrl: group.iconUrl,
              viewMode: group.viewMode,
              order: gi,
              tiles: {
                create: group.tiles.map((tile, ti) => ({
                  name: tile.name,
                  icon: tile.icon,
                  iconUrl: tile.iconUrl,
                  color: tile.color,
                  bgColor: tile.bgColor,
                  borderColor: tile.borderColor,
                  borderMatchesBg: tile.borderMatchesBg,
                  url: tile.url,
                  description: tile.description,
                  order: ti,
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
