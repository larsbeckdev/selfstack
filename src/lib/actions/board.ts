"use server";

import { revalidatePath, refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  CATEGORY_COLS,
  getCategoryInnerCols,
  getCategoryWidth,
  getGroupTileCols,
  getGroupWidth,
  getTileSize,
  TILE_SPANS,
} from "@/lib/grid";
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
  globalRole?: string,
): Promise<BoardRole | null> {
  const board = await db.board.findUnique({
    where: { id: boardId },
    select: { userId: true, orgId: true },
  });
  if (!board) return null;

  // Global admin: full access everywhere.
  if (globalRole === "admin") return "owner";

  // Owner (creator) has full access.
  if (board.userId === userId) return "owner";

  const member = await db.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { role: true },
  });
  if (member) return member.role as BoardRole;

  // Global editor can edit any ORG board, but not private user boards.
  if (globalRole === "editor" && board.orgId) return "editor";
  return null;
}

async function requireBoardAccess(
  boardId: string,
  minRole: "viewer" | "editor" | "owner",
) {
  const { user } = await requireAuth();
  const role = await getBoardRole(boardId, user.id, user.role);
  if (!role) throw new Error("Board not found");

  const hierarchy: BoardRole[] = ["viewer", "editor", "owner"];
  if (hierarchy.indexOf(role) < hierarchy.indexOf(minRole)) {
    throw new Error("Insufficient permissions");
  }
  return { user, role };
}

function boardAccessWhere(userId: string, globalRole?: string) {
  // Global admin: all boards.
  if (globalRole === "admin") return {};
  // Global editor: own, member-of, and every org board.
  if (globalRole === "editor") {
    return {
      OR: [
        { userId },
        { members: { some: { userId } } },
        { orgId: { not: null } },
      ],
    };
  }
  // Regular user: own + explicitly shared.
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
    .max(200)
    .regex(
      /^@?[a-z0-9]+(?:[-/][a-z0-9]+)*$/,
      "Nur Kleinbuchstaben, Zahlen, Bindestriche und Schrägstriche",
    )
    .optional(),
  icon: z.string().default("layout-dashboard"),
  iconUrl: iconUrlSchema,
  isPublic: z.boolean().default(false),
  layoutMode: z.enum(["auto", "free"]).optional(),
  /** When set, the board is owned by an organization. Admin only. */
  orgId: z.string().nullable().optional(),
});

export async function createBoard(data: z.infer<typeof boardSchema>) {
  const { user } = await requireAuth();
  const parsed = boardSchema.parse(data);

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { username: true, role: true },
  });

  const baseName = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Determine slug prefix based on ownership type.
  // - Admin + orgId       → `@<orgSlug>/`   (org board)
  // - Admin + no orgId    → ``               (system board, no prefix)
  // - Regular user        → `<username>/`   (personal user board)
  let prefix = "";
  let orgId: string | null = null;
  if (dbUser?.role === "admin" && parsed.orgId) {
    const org = await db.organization.findUnique({
      where: { id: parsed.orgId },
      select: { id: true, slug: true },
    });
    if (!org) throw new Error("Organisation nicht gefunden");
    prefix = `@${org.slug}/`;
    orgId = org.id;
  } else if (dbUser?.role !== "admin" && dbUser?.username) {
    prefix = `${dbUser.username}/`;
  }

  let slug = `${prefix}${baseName}`;
  let counter = 0;
  while (await db.board.findUnique({ where: { slug } })) {
    counter++;
    slug = `${prefix}${baseName}-${counter}`;
  }

  const maxOrder = await db.board.aggregate({
    where: { userId: user.id },
    _max: { order: true },
  });

  const { orgId: _ignored, ...rest } = parsed;
  const board = await db.board.create({
    data: {
      ...rest,
      iconUrl: parsed.iconUrl || null,
      slug,
      order: (maxOrder._max.order ?? -1) + 1,
      userId: user.id,
      orgId,
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

export async function resetBoardColors(boardId: string) {
  await requireBoardAccess(boardId, "editor");

  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  await db.$transaction([
    db.category.updateMany({
      where: { boardId },
      data: { bgColor: null, borderColor: null, borderMatchesBg: false },
    }),
    db.group.updateMany({
      where: { category: { boardId } },
      data: { bgColor: null, borderColor: null, borderMatchesBg: false },
    }),
    db.tile.updateMany({
      where: { group: { category: { boardId } } },
      data: { bgColor: null, borderColor: null, borderMatchesBg: false },
    }),
  ]);

  revalidatePath(`/board/${board.slug}`);
  refresh();
}

export async function getBoards() {
  const { user } = await requireAuth();
  return db.board.findMany({
    where: boardAccessWhere(user.id, user.role),
    orderBy: { order: "asc" },
  });
}

export async function getBoardWithContents(boardId: string) {
  const { user } = await requireAuth();
  return db.board.findFirst({
    where: { id: boardId, ...boardAccessWhere(user.id, user.role) },
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
  color: z.string().default("#6366f1").optional(),
  bgColor: z.string().nullable().optional(),
  borderColor: z.string().nullable().optional(),
  borderMatchesBg: z.boolean().default(false).optional(),
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
  borderColor: z.string().nullable().optional(),
  borderMatchesBg: z.boolean().default(false).optional(),
  layout: z.enum(["list", "snap"]).default("snap").optional(),
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
    include: { category: true, tiles: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");

  const updated = await db.group.update({
    where: { id: groupId },
    data,
  });

  // When switching from list → snap, tile x/y may overlap because list mode
  // ignores positions. Reflow tiles into non-overlapping slots, preserving
  // their current order.
  if (data.layout === "snap" && group.layout !== "snap") {
    const catCols = getCategoryInnerCols(getCategoryWidth(group.category.w));
    const tileCols = getGroupTileCols(catCols, getGroupWidth(updated.w));

    type Placed = { x: number; y: number; w: number; h: number };
    const placed: Placed[] = [];
    const overlaps = (a: Placed, b: Placed) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    // Keep current order (y asc, x asc) to remain stable.
    const ordered = [...group.tiles].sort(
      (a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0),
    );

    for (const tile of ordered) {
      const span = TILE_SPANS[getTileSize(tile)];
      const w = Math.min(span.w, tileCols);
      const h = span.h;
      // Scan top-to-bottom, left-to-right for the first free slot.
      let fx = 0;
      let fy = 0;
      outer: for (let y = 0; y < 10000; y++) {
        for (let x = 0; x <= tileCols - w; x++) {
          const candidate: Placed = { x, y, w, h };
          if (!placed.some((p) => overlaps(candidate, p))) {
            fx = x;
            fy = y;
            break outer;
          }
        }
      }
      placed.push({ x: fx, y: fy, w, h });
      if ((tile.x ?? 0) !== fx || (tile.y ?? 0) !== fy) {
        await db.tile.update({
          where: { id: tile.id },
          data: { x: fx, y: fy },
        });
      }
    }
  }

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

  const siblings = await db.tile.findMany({
    where: { groupId: tile.groupId },
    select: { id: true, x: true, y: true, size: true },
  });

  const catCols = getCategoryInnerCols(getCategoryWidth(tile.group.category.w));
  const tileCols = getGroupTileCols(catCols, getGroupWidth(tile.group.w));
  const srcSpan = TILE_SPANS[getTileSize(tile)];

  const overlapsAt = (x: number, y: number) => {
    for (const o of siblings) {
      const oSpan = TILE_SPANS[getTileSize(o)];
      const ox = o.x ?? 0;
      const oy = o.y ?? 0;
      if (
        x < ox + oSpan.w &&
        x + srcSpan.w > ox &&
        y < oy + oSpan.h &&
        y + srcSpan.h > oy
      ) {
        return true;
      }
    }
    return false;
  };

  const startX = Math.max(0, Math.min(tile.x ?? 0, tileCols - srcSpan.w));
  const startY = (tile.y ?? 0) + srcSpan.h;

  let newX = startX;
  let newY = startY;
  // Scan downward, row by row, left-to-right. Skip the source tile itself.
  outer: for (let y = startY; y < startY + 1000; y++) {
    for (let x = 0; x <= tileCols - srcSpan.w; x++) {
      // First row: prefer to stay in same column as source, then fallback to scan
      const cx = y === startY && x === 0 ? startX : x;
      if (!overlapsAt(cx, y)) {
        newX = cx;
        newY = y;
        break outer;
      }
    }
  }

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
      x: newX,
      y: newY,
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
      borderColor: group.borderColor,
      borderMatchesBg: group.borderMatchesBg,
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

  // Find a free slot for the copy: prefer right → left → below of the original,
  // otherwise scan the board top-to-bottom, left-to-right for the first fit.
  // Category widths may be stored as legacy values (e.g. 6 or 12); clamp to the
  // actual visual 1–4 span so collision math matches the rendered grid.
  const existingRaw = await db.category.findMany({
    where: { boardId: category.boardId, NOT: { id: category.id } },
    select: { x: true, y: true, w: true, h: true },
  });
  const existing = existingRaw.map((c) => ({
    x: c.x,
    y: c.y,
    w: getCategoryWidth(c.w),
    // Categories occupy a single row in the board grid (gridRow: y+1). The
    // stored `h` is unrelated to visual placement, so always treat as 1 for
    // collision math.
    h: 1,
  }));
  const origW = getCategoryWidth(category.w);
  const origH = 1;
  existing.push({ x: category.x, y: category.y, w: origW, h: origH });
  const newW = origW;
  const newH = origH;
  const fits = (x: number, y: number) => {
    if (x < 0 || x + newW > CATEGORY_COLS || y < 0) return false;
    for (const c of existing) {
      if (x < c.x + c.w && x + newW > c.x && y < c.y + c.h && y + newH > c.y) {
        return false;
      }
    }
    return true;
  };
  let nextX = 0;
  let nextY = 0;
  const preferred = [
    { x: category.x + origW, y: category.y }, // right
    { x: category.x - newW, y: category.y }, // left
    { x: category.x, y: category.y + origH }, // below
    { x: category.x, y: category.y - origH }, // above
  ];
  const hit = preferred.find((p) => fits(p.x, p.y));
  if (hit) {
    nextX = hit.x;
    nextY = hit.y;
  } else {
    outer: for (let y = 0; y < 500; y++) {
      for (let x = 0; x <= CATEGORY_COLS - newW; x++) {
        if (fits(x, y)) {
          nextX = x;
          nextY = y;
          break outer;
        }
      }
    }
  }

  const copy = await db.category.create({
    data: {
      name: `${category.name} (Kopie)`,
      icon: category.icon,
      iconUrl: category.iconUrl,
      color: category.color,
      bgColor: category.bgColor,
      borderColor: category.borderColor,
      borderMatchesBg: category.borderMatchesBg,
      x: nextX,
      y: nextY,
      w: origW,
      h: origH,
      boardId: category.boardId,
      groups: {
        create: category.groups.map((group) => ({
          name: group.name,
          icon: group.icon,
          iconUrl: group.iconUrl,
          bgColor: group.bgColor,
          borderColor: group.borderColor,
          borderMatchesBg: group.borderMatchesBg,
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
      orgId: true,
      members: { select: { userId: true } },
    },
  });
  if (!board) throw new Error("Board not found");

  const excludeIds = [board.userId, ...board.members.map((m) => m.userId)];

  // For org boards, restrict candidates to members of that organization
  // so you cannot accidentally share org boards outside the org.
  const where: {
    id: { notIn: string[] };
    orgMembers?: { some: { orgId: string } };
  } = { id: { notIn: excludeIds } };
  if (board.orgId) {
    where.orgMembers = { some: { orgId: board.orgId } };
  }

  return db.user.findMany({
    where,
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  });
}

// ─── Reorder Actions ─────────────────────────────────────────────────────────

export async function reorderBoards(orderedIds: string[]) {
  const { user } = await requireAuth();
  // Only reorder boards the user owns (sidebar shows user's own board list).
  const owned = await db.board.findMany({
    where: { userId: user.id, id: { in: orderedIds } },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((b) => b.id));
  const ids = orderedIds.filter((id) => ownedSet.has(id));
  await db.$transaction(
    ids.map((id, i) => db.board.update({ where: { id }, data: { order: i } })),
  );
  revalidatePath("/dashboard");
  revalidatePath("/settings/boards");
  refresh();
}

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
  // Clamp x so that x + width stays within the 4-col grid.
  const newX = Math.min(category.x, 4 - width);
  await db.category.update({
    where: { id: categoryId },
    data: { w: width, x: Math.max(0, newX) },
  });
  await revalidateBoard(category.boardId);
  refresh();
}

export async function setBoardLayoutMode(
  boardId: string,
  mode: "auto" | "free",
) {
  await requireBoardAccess(boardId, "editor");
  const board = await db.board.findUnique({ where: { id: boardId } });
  if (!board) throw new Error("Board not found");

  // When switching to free mode for the first time, assign each category a
  // unique (x, y) so they don't all stack at the origin.
  if (mode === "free" && board.layoutMode !== "free") {
    const cats = await db.category.findMany({
      where: { boardId },
      orderBy: [{ y: "asc" }, { x: "asc" }],
    });
    const allAtOrigin = cats.every((c) => c.x === 0 && c.y === 0);
    if (allAtOrigin && cats.length > 1) {
      await db.$transaction(
        cats.map((c, i) =>
          db.category.update({
            where: { id: c.id },
            data: { x: 0, y: i },
          }),
        ),
      );
    }
  }

  await db.board.update({
    where: { id: boardId },
    data: { layoutMode: mode },
  });
  await revalidateBoard(boardId);
  refresh();
}

export async function setCategoryPosition(
  categoryId: string,
  x: number,
  y: number,
) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0)
    throw new Error("Invalid position");
  const category = await db.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) throw new Error("Category not found");
  await requireBoardAccess(category.boardId, "editor");
  await db.category.update({ where: { id: categoryId }, data: { x, y } });
  await revalidateBoard(category.boardId);
  refresh();
}

export async function setGroupPosition(
  groupId: string,
  x: number,
  y: number,
  categoryId?: string,
) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0)
    throw new Error("Invalid position");
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");
  const data: { x: number; y: number; categoryId?: string } = { x, y };
  if (categoryId && categoryId !== group.categoryId) {
    const target = await db.category.findUnique({ where: { id: categoryId } });
    if (!target) throw new Error("Target category not found");
    if (target.boardId !== group.category.boardId)
      throw new Error("Cross-board move not allowed");
    data.categoryId = categoryId;
  }
  await db.group.update({ where: { id: groupId }, data });
  await revalidateBoard(group.category.boardId);
  refresh();
}

export async function setGroupWidth(groupId: string, width: number) {
  if (width !== 1 && width !== 2) throw new Error("Invalid width");
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: { category: true },
  });
  if (!group) throw new Error("Group not found");
  await requireBoardAccess(group.category.boardId, "editor");
  const newX = width === 2 ? 0 : Math.min(group.x ?? 0, 1);
  await db.group.update({
    where: { id: groupId },
    data: { w: width, x: Math.max(0, newX) },
  });
  await revalidateBoard(group.category.boardId);
  refresh();
}

export async function setTilePosition(tileId: string, x: number, y: number) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0)
    throw new Error("Invalid position");
  const tile = await db.tile.findUnique({
    where: { id: tileId },
    include: { group: { include: { category: true } } },
  });
  if (!tile) throw new Error("Tile not found");
  await requireBoardAccess(tile.group.category.boardId, "editor");
  await db.tile.update({ where: { id: tileId }, data: { x, y } });
  await revalidateBoard(tile.group.category.boardId);
  refresh();
}
