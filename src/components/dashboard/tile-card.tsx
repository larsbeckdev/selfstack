"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Copy,
} from "lucide-react";
import type { Tile } from "@/generated/prisma/client";
import type { TileViewMode } from "@/types";
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
import { useEditMode } from "./edit-mode-context";
import { toast } from "sonner";

export function TileCard({
  tile,
  viewMode = "grid",
}: {
  tile: Tile;
  viewMode?: TileViewMode;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const isEditing = useEditMode();

  const iconColor = tile.color;
  const bg = tile.bgColor || undefined;
  const border = tile.borderMatchesBg
    ? tile.bgColor || tile.color + "40"
    : tile.borderColor || tile.color + "40";

  const handleDelete = async () => {
    try {
      await deleteTile(tile.id);
      toast.success("Kachel gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
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
              Öffnen
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 size-3.5" />
          Bearbeiten
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            try {
              await duplicateTile(tile.id);
              toast.success("Kachel dupliziert");
            } catch {
              toast.error("Fehler beim Duplizieren");
            }
          }}>
          <Copy className="mr-2 size-3.5" />
          Duplizieren
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 size-3.5" />
          Löschen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  let content: React.ReactNode;

  if (viewMode === "grid-sm") {
    // Small: icon only, always tooltip
    const inner = (
      <div
        className={`group relative flex size-10 items-center justify-center rounded-md border transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-4"
          style={{ color: iconColor }}
        />
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
            <a href={tile.url} target="_blank" rel="noopener noreferrer">
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
  } else if (viewMode === "grid-lg") {
    // Large: bigger tile with icon, name, and description preview
    const inner = (
      <div
        className={`group relative flex h-28 w-28 flex-col items-center justify-center gap-1.5 rounded-lg border p-3 transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-8"
          style={{ color: iconColor }}
        />
        <span className="max-w-full truncate text-xs font-medium leading-tight">
          {tile.name}
        </span>
        {tile.description && (
          <span className="max-w-full truncate text-[9px] text-muted-foreground">
            {tile.description}
          </span>
        )}
        {tileMenu && (
          <div className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {tileMenu}
          </div>
        )}
      </div>
    );
    content =
      !isEditing && tile.url ? (
        <a href={tile.url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        inner
      );
  } else if (viewMode === "list") {
    // List: horizontal row
    const inner = (
      <div
        className={`group relative flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-4 shrink-0"
          style={{ color: iconColor }}
        />
        <span className="flex-1 truncate text-sm font-medium">{tile.name}</span>
        {tile.description && (
          <span className="hidden truncate text-xs text-muted-foreground sm:block sm:max-w-[200px]">
            {tile.description}
          </span>
        )}
        {isEditing && tile.url && (
          <a
            href={tile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
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
    content =
      !isEditing && tile.url ? (
        <a href={tile.url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        inner
      );
  } else {
    // Default grid: current medium size
    const inner = (
      <div
        className={`group relative flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors hover:brightness-110 ${isEditing ? "cursor-grab" : ""}`}
        style={{ borderColor: border, backgroundColor: bg }}>
        <DynamicIcon
          name={tile.icon}
          iconUrl={tile.iconUrl}
          className="size-6"
          style={{ color: iconColor }}
        />
        <span className="max-w-full truncate text-[10px] font-medium leading-tight">
          {tile.name}
        </span>
        {tileMenu && (
          <div className="absolute right-0.5 top-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            {tileMenu}
          </div>
        )}
      </div>
    );
    content =
      !isEditing && tile.url ? (
        <a href={tile.url} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      ) : (
        inner
      );
  }

  // Wrap non-small grid items with tooltip if they have a description
  if (viewMode !== "grid-sm" && tile.description && viewMode !== "list") {
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
