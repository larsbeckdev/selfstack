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
  Ruler,
  Check,
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
import {
  duplicateTile,
  deleteTile,
  moveTileToGroup,
  updateTile,
} from "@/lib/actions/board";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";
import { cn, withAlpha } from "@/lib/utils";
import { getTileSize, type TileSize, type GroupLayoutMode } from "@/lib/grid";

/**
 * Presentational tile card. Placement (grid span, sort order) is handled
 * by the parent `SortableTile` + `GroupCard`; this component only renders
 * the tile's visual content.
 */
export function TileCard({
  tile,
  layout,
  otherGroups,
}: {
  tile: Tile;
  layout: GroupLayoutMode;
  otherGroups: { id: string; name: string; categoryName: string }[];
}) {
  const isEditing = useEditMode();
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const size: TileSize = getTileSize(tile);
  const href = !isEditing && tile.url ? tile.url : undefined;

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

  const handleResize = async (newSize: TileSize) => {
    if (newSize === size) return;
    try {
      await updateTile(tile.id, { size: newSize });
      router.refresh();
    } catch {
      toast.error(t("error.updateFailed"));
    }
  };

  // ── List mode: row layout ─────────────────────────────────────────────
  if (layout === "list") {
    const content = (
      <div
        className={cn(
          "flex h-full items-center gap-3 rounded-lg border border-border/40 bg-card px-3 py-2 transition-colors",
          href && "hover:bg-accent/50 hover:border-border",
          isEditing && "cursor-grab active:cursor-grabbing",
        )}
        style={{
          backgroundColor: withAlpha(tile.bgColor, 0.22),
          borderColor: tile.borderMatchesBg
            ? withAlpha(tile.bgColor, 0.35) ?? withAlpha(tile.color, 0.25)
            : tile.borderColor || undefined,
        }}>
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
        {isEditing && (
          <TileActionsMenu
            t={t}
            size={size}
            otherGroups={otherGroups}
            onEdit={() => setEditOpen(true)}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onMove={handleMove}
            onResize={handleResize}
          />
        )}
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
              className="block h-full">
              {content}
            </a>
          ) : (
            <div className="h-full">{content}</div>
          )}
        </ContextMenuTrigger>
        {tileContextMenu({
          t,
          size,
          onEdit: () => setEditOpen(true),
          onDuplicate: handleDuplicate,
          onDelete: handleDelete,
          onMove: handleMove,
          onResize: handleResize,
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
    "relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-border/50 bg-card p-2 text-center transition-colors overflow-hidden",
    href && "hover:bg-muted/40 hover:border-border",
    isEditing && "cursor-grab active:cursor-grabbing hover:border-primary/50",
  );

  const cardStyle: React.CSSProperties = {
    backgroundColor: withAlpha(tile.bgColor, 0.22),
    borderColor: tile.borderMatchesBg
      ? withAlpha(tile.bgColor, 0.35) ?? withAlpha(tile.color, 0.25)
      : tile.borderColor || undefined,
  };

  const cornerSlot = isEditing ? (
    <TileActionsMenu
      t={t}
      size={size}
      otherGroups={otherGroups}
      onEdit={() => setEditOpen(true)}
      onDuplicate={handleDuplicate}
      onDelete={handleDelete}
      onMove={handleMove}
      onResize={handleResize}
      className="absolute right-1 top-1"
    />
  ) : tile.statusCheck ? (
    <TileStatusIndicator tileId={tile.id} className="absolute right-1 top-1" />
  ) : null;

  const inner = (
    <>
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
            "mt-1.5 max-w-full truncate font-medium",
            size === "default" && "text-xs",
            size === "large" && "text-sm",
          )}>
          {tile.name}
        </span>
      )}
      {size === "large" && tile.description && (
        <span className="mt-1 line-clamp-2 max-w-full text-xs text-muted-foreground">
          {tile.description}
        </span>
      )}
    </>
  );

  const body =
    size === "small" ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cardClasses} style={cardStyle}>
            {inner}
          </div>
        </TooltipTrigger>
        <TooltipContent>{tile.name}</TooltipContent>
      </Tooltip>
    ) : (
      <div className={cardClasses} style={cardStyle}>
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
            className="block h-full w-full">
            {body}
          </a>
        ) : (
          <div className="h-full w-full">{body}</div>
        )}
      </ContextMenuTrigger>
      {tileContextMenu({
        t,
        size,
        onEdit: () => setEditOpen(true),
        onDuplicate: handleDuplicate,
        onDelete: handleDelete,
        onMove: handleMove,
        onResize: handleResize,
        otherGroups,
      })}
      <EditTileDialog tile={tile} open={editOpen} onOpenChange={setEditOpen} />
    </ContextMenu>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const SIZE_OPTIONS: TileSize[] = ["small", "default", "large"];

function TileActionsMenu({
  t,
  size,
  otherGroups,
  onEdit,
  onDuplicate,
  onDelete,
  onMove,
  onResize,
  className,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  size: TileSize;
  otherGroups: { id: string; name: string; categoryName: string }[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (groupId: string) => void;
  onResize: (size: TileSize) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            "size-6 rounded-md bg-background/80 shadow-sm hover:bg-background",
            className,
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          title={t("common.moreActions")}>
          <MoreHorizontal className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 size-4" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Ruler className="mr-2 size-4" />
            {t("common.size")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {SIZE_OPTIONS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => onResize(s)}>
                {s === size ? (
                  <Check className="mr-2 size-4" />
                ) : (
                  <span className="mr-2 size-4" />
                )}
                {t(`tile.size.${s}` as "tile.size.small")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={onDuplicate}>
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
                <DropdownMenuItem key={g.id} onClick={() => onMove(g.id)}>
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
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="mr-2 size-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function tileContextMenu({
  t,
  size,
  onEdit,
  onDuplicate,
  onDelete,
  onMove,
  onResize,
  otherGroups,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  size: TileSize;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (groupId: string) => void;
  onResize: (size: TileSize) => void;
  otherGroups: { id: string; name: string; categoryName: string }[];
}) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={onEdit}>
        <Pencil className="mr-2 size-4" />
        {t("common.edit")}
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Ruler className="mr-2 size-4" />
          {t("common.size")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {SIZE_OPTIONS.map((s) => (
            <ContextMenuItem key={s} onClick={() => onResize(s)}>
              {s === size ? (
                <Check className="mr-2 size-4" />
              ) : (
                <span className="mr-2 size-4" />
              )}
              {t(`tile.size.${s}` as "tile.size.small")}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
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
                {g.categoryName} / {g.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={onDelete}>
        <Trash2 className="mr-2 size-4" />
        {t("common.delete")}
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
