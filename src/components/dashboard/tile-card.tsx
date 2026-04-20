"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { Tile } from "@/generated/prisma/client";
import { getTileSize, type TileSize } from "@/lib/tile-size";
import { deleteTile, duplicateTile } from "@/lib/actions/board";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditTileDialog } from "./edit-tile-dialog";
import { TileStatusIndicator } from "./tile-status-indicator";
import { useEditMode } from "./edit-mode-context";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function TileCard({
  tile,
  size: sizeProp,
}: {
  tile: Tile;
  /** Explicit size override. Defaults to tile.size. */
  size?: TileSize;
}) {
  const size: TileSize = sizeProp ?? getTileSize(tile);
  const [editOpen, setEditOpen] = useState(false);
  const isEditing = useEditMode();
  const router = useRouter();
  const { t } = useTranslation();

  const iconColor = tile.color;
  const bg = tile.bgColor || undefined;
  const border = tile.borderMatchesBg
    ? tile.bgColor || tile.color + "40"
    : tile.borderColor || tile.color + "40";
  const showStatus = tile.statusCheck && !!tile.url;
  // Only one corner indicator at a time:
  //  - view mode: status dot (top-right)
  //  - edit mode: three-dot menu (top-right, replaces status)
  const statusDot = showStatus && !isEditing ? (
    <TileStatusIndicator tileId={tile.id} />
  ) : null;

  const handleDelete = async () => {
    try {
      await deleteTile(tile.id);
      router.refresh();
      toast.success(t("tile.deleted"));
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  const tileMenu = isEditing ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-5">
          <MoreHorizontal className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {tile.url && (
          <DropdownMenuItem asChild>
            <a href={tile.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 size-3.5" />
              {t("common.open")}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 size-3.5" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            try {
              await duplicateTile(tile.id);
              router.refresh();
              toast.success(t("tile.duplicated"));
            } catch {
              toast.error(t("error.duplicateFailed"));
            }
          }}>
          <Copy className="mr-2 size-3.5" />
          {t("common.duplicate")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 size-3.5" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  let content: React.ReactNode;

  if (size === "small") {
    // Small (1×1): icon only, always tooltip
    const inner = (
      <div
        className={`group relative flex size-full min-h-[56px] items-center justify-center rounded-md border transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-5"
          style={{ color: iconColor }}
        />

        {statusDot && (
          <div className="absolute right-0.5 top-0.5">{statusDot}</div>
        )}

        {tileMenu && (
          <div className="absolute -right-1 -top-1 opacity-0 transition-opacity group-hover:opacity-100">
            {tileMenu}
          </div>
        )}
      </div>
    );
    content = (
      <Tooltip>
        <TooltipTrigger asChild>
          {!isEditing && tile.url ? (
            <a
              href={tile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block size-full">
              {inner}
            </a>
          ) : (
            inner
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{tile.name}</p>
          {tile.description && (
            <p className="text-xs text-muted-foreground">{tile.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  } else if (size === "large") {
    // Large (4×4): full widget
    const inner = (
      <div
        className={`group relative flex size-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-10"
          style={{ color: iconColor }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block max-w-full truncate text-sm font-semibold leading-tight">
              {tile.name}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tile.name}</p>
          </TooltipContent>
        </Tooltip>
        {tile.description && (
          <span className="block max-w-full truncate text-center text-xs text-muted-foreground">
            {tile.description}
          </span>
        )}
        {statusDot && <div className="absolute right-2 top-2">{statusDot}</div>}
        {tileMenu && (
          <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
            {tileMenu}
          </div>
        )}
      </div>
    );
    content =
      !isEditing && tile.url ? (
        <a
          href={tile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block size-full">
          {inner}
        </a>
      ) : (
        inner
      );
  } else if (size === "list") {
    // List: horizontal row — fixed column widths, truncated title
    const inner = (
      <div
        className={`group relative flex items-center gap-2 rounded-md border px-3 py-2 transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <div className="flex w-8 shrink-0 items-center justify-center">
          <DynamicIcon
            name={tile.icon}
            iconUrl={tile.iconUrl}
            className="size-4"
            style={{ color: iconColor }}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1 truncate text-sm font-medium">
              {tile.name}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tile.name}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex w-20 shrink-0 items-center justify-end gap-2">
          {statusDot}
        </div>
        {tile.url && (
          <a
            href={tile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="size-3.5" />
          </a>
        )}
        {tileMenu && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            {tileMenu}
          </div>
        )}
      </div>
    );
    content = inner;
  } else {
    // Default (2×2): icon + title + content preview
    const inner = (
      <div
        className={`group relative flex size-full min-h-[80px] flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-7"
          style={{ color: iconColor }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block max-w-full truncate text-xs font-medium leading-tight">
              {tile.name}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tile.name}</p>
          </TooltipContent>
        </Tooltip>
        {tile.description && (
          <span className="block max-w-full truncate text-center text-[10px] text-muted-foreground">
            {tile.description}
          </span>
        )}
        {statusDot && <div className="absolute right-1 top-1">{statusDot}</div>}
        {tileMenu && (
          <div className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {tileMenu}
          </div>
        )}
      </div>
    );
    content =
      !isEditing && tile.url ? (
        <a
          href={tile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block size-full">
          {inner}
        </a>
      ) : (
        inner
      );
  }

  // Wrap medium/large tiles with a description tooltip.
  if (size !== "small" && size !== "list" && tile.description) {
    content = (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tile.description}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      {content}
      <EditTileDialog tile={tile} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
