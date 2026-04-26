import type {
  Board,
  Category,
  Group,
  Tile,
  BoardMember,
} from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  image: string | null;
  role: string;
};

export type BoardRole = "owner" | "editor" | "viewer";

export type BoardWithContents = Board & {
  categories: CategoryWithGroups[];
};

export type BoardMemberWithUser = BoardMember & {
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    image: string | null;
  };
};

export type CategoryWithGroups = Category & {
  groups: GroupWithTiles[];
};

export type GroupWithTiles = Group & {
  tiles: Tile[];
};

export type AddDialogType = "category" | "group" | "tile";

export type TileViewMode = "grid" | "grid-sm" | "grid-lg" | "list";
