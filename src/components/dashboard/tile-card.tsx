"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tile } from "@/generated/prisma/client";
import {
  Pencil,
  Trash2,
  Copy as CopyIcon,
  MoveRight,
  MoreHorizontal,
} from "lucide-react";
import { DynamicIcon } from "@/components/dynamic-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TileStatusIndicator } from "./tile-status-indicator";
import { EditTileDialog } from "./edit-tile-dialog";
import { useEditMode } from "./edit-mode-context";
import { useDrag } from "./draggable-item";
import {
  duplicateTile,
  deleteTile,
  moveTileToGroup,
} from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TILE_SPANS,
  type TileSize,
  getTileSize,
  gridItemStyle,
} from "@/lib/grid";

type TileMode = "grid" | "list";

export function TileCard({
  tile,
  mode,
  otherGroups,
  dragHandle,
}: {
  tile: Tile;
  mode: TileMode;
  otherGroups: { id: string; name: string; categoryName: string }[];
  dragHandle?: React.ReactNode;
}) {
  const isEditing = useEditMode();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const drag = useDrag();
  const isDragging = drag?.isDragging ?? false;

  const size: TileSize = getTileSize(tile);
  const href = !isEditing && tile.url ? tile.url : undefined;
  const { w, h } = TILE_SPANS[size];

  const style: React.CSSProperties = {
    ...(mode === "grid" ? gridItemStyle({ x: tile.x, y: tile.y, w, h }) : {}),
    backgroundColor: tile.bgColor || undefined,
    borderColor: tile.borderMatchesBg
      ? tile.bgColor || tile.color + "40"
      : tile.borderColor || tile.color + "40",
  };

  const handleDuplicate = async () => {
    try {
      await duplicateTile(tile.id);
      toast.success(t("tile.duplicated"));
      router.refresh();
    } catch {
      toast.error(t("error.duplicateFailed"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTile(tile.id);
      toast.success(t("tile.deleted"));
      router.refresh();
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  const handleMove = async (groupId: string) => {
    try {
      await moveTileToGroup(tile.id, groupId);
      toast.success(t("tile.moved"));
      router.refresh();
    } catch {
      toast.error(t("error.updateFailed"));
    }
  };

  // ── List mode: row layout ─────────────────────────────────────────────
  if (mode === "list") {
    const content = (
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
          href && "hover:bg-accent/50",
        )}
        style={{
          backgroundColor: tile.bgColor || undefined,
          borderColor: tile.borderMatchesBg
            ? tile.bgColor || tile.color + "40"
            : tile.borderColor || tile.color + "40",
        }}>
        {dragHandle}
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-5 shrink-0"
          style={{ color: tile.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{tile.name}</span>
            {tile.statusCheck && (
              <TileStatusIndicator tileId={tile.id} className="shrink-0" />
            )}
          </div>
          {tile.description && (
            <p className="truncate text-xs text-muted-foreground">
              {tile.description}
            </p>
          )}
        </div>
      </div>
    );
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="block">
              {content}
            </a>
          ) : (
            <div>{content}</div>
          )}
        </ContextMenuTrigger>
        {tileContextMenu({
          t,
          onEdit: () => setEditOpen(true),
          onDuplicate: handleDuplicate,
          onDelete: handleDelete,
          onMove: handleMove,
          otherGroups,
        })}
        <EditTileDialog
          tile={tile}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      </ContextMenu>
    );
  }

  // ── Grid mode: positional card ────────────────────────────────────────
  const cardClasses = cn(
    "relative flex flex-col items-center justify-center rounded-xl border p-2 transition-all",
    "overflow-hidden text-center shadow-sm",
    href && "hover:brightness-110 hover:shadow-md",
    isEditing &&
      drag?.enabled &&
      "cursor-grab select-none active:cursor-grabbing hover:ring-2 hover:ring-primary/50 hover:shadow-md",
    isDragging && "ring-2 ring-primary shadow-2xl",
  );

  const dragProps =
    isEditing && drag?.enabled ? drag.dragHandleProps : undefined;

  const cornerSlot = isEditing ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className="absolute right-1 top-1 size-6 rounded-md bg-background/80 shadow-sm hover:bg-background"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title={t("common.moreActions")}>
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 size-4" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <CopyIcon className="mr-2 size-4" />
          {t("common.duplicate")}
        </DropdownMenuItem>
        {otherGroups.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MoveRight className="mr-2 size-4" />
              {t("tile.moveTo")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {otherGroups.map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  onClick={() => handleMove(g.id)}>
                  <span className="text-muted-foreground">
                    {g.categoryName} /
                  </span>
                  <span className="ml-1">{g.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleDelete}>
          <Trash2 className="mr-2 size-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : tile.statusCheck ? (
    <TileStatusIndicator
      tileId={tile.id}
      className="absolute right-1 top-1"
    />
  ) : null;

  const inner = (
    <>
      {dragHandle}
      {cornerSlot}
      <DynamicIcon
        name={tile.icon}
        iconUrl={tile.iconUrl}
        className={cn(
          size === "small" && "size-5",
          size === "default" && "size-7",
          size === "large" && "size-10",
        )}
        style={{ color: tile.color }}
      />
      {size !== "small" && (
        <span
          className={cn(
            "mt-1 max-w-full truncate font-medium",
            size === "default" && "text-[11px]",
            size === "large" && "text-sm",
          )}>
          {tile.name}
        </span>
      )}
      {size === "large" && tile.description && (
        <span className="mt-1 line-clamp-2 max-w-full text-[10px] text-muted-foreground">
          {tile.description}
        </span>
      )}
    </>
  );

  const body =
    size === "small" ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <div {...dragProps} className={cardClasses} style={style}>
            {inner}
          </div>
        </TooltipTrigger>
        <TooltipContent>{tile.name}</TooltipContent>
      </Tooltip>
    ) : (
      <div {...dragProps} className={cardClasses} style={style}>
        {inner}
      </div>
    );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="contents">
            {body}
          </a>
        ) : (
          <div className="contents">{body}</div>
        )}
      </ContextMenuTrigger>
      {tileContextMenu({
        t,
        onEdit: () => setEditOpen(true),
        onDuplicate: handleDuplicate,
        onDelete: handleDelete,
        onMove: handleMove,
        otherGroups,
      })}
      <EditTileDialog tile={tile} open={editOpen} onOpenChange={setEditOpen} />
    </ContextMenu>
  );
}

function tileContextMenu({
  t,
  onEdit,
  onDuplicate,
  onDelete,
  onMove,
  otherGroups,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (groupId: string) => void;
  otherGroups: { id: string; name: string; categoryName: string }[];
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={onEdit}>
        <Pencil className="mr-2 size-4" />
        {t("common.edit")}
      </ContextMenuItem>
      <ContextMenuItem onClick={onDuplicate}>
        <CopyIcon className="mr-2 size-4" />
        {t("common.duplicate")}
      </ContextMenuItem>
      {otherGroups.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <MoveRight className="mr-2 size-4" />
            {t("tile.moveTo")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {otherGroups.map((g) => (
              <ContextMenuItem key={g.id} onClick={() => onMove(g.id)}>
                {g.categoryName} → {g.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem className="text-destructive" onClick={onDelete}>
        <Trash2 className="mr-2 size-4" />
        {t("common.delete")}
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
