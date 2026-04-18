import type { Board, Category, Group, Tile } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  role: string;
};

export type BoardWithContents = Board & {
  categories: CategoryWithGroups[];
};

export type CategoryWithGroups = Category & {
  groups: GroupWithTiles[];
};

export type GroupWithTiles = Group & {
  tiles: Tile[];
};

export type AddDialogType = "category" | "group" | "tile";

export type TileViewMode = "grid" | "grid-sm" | "grid-lg" | "list";
