"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Lock,
  UserPlus,
  Trash2,
  Crown,
  Pencil,
  Eye,
  Copy,
} from "lucide-react";
import type { Board } from "@/generated/prisma/client";
import type { BoardMemberWithUser, BoardRole } from "@/types";
import {
  updateBoard,
  deleteBoard,
  getBoardMembers,
  addBoardMember,
  updateBoardMemberRole,
  removeBoardMember,
  getAvailableUsersForBoard,
} from "@/lib/actions/board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconPicker } from "@/components/icon-picker";
import { toast } from "sonner";

export function BoardSettingsDialog({
  board,
  boardRole,
  open,
  onOpenChange,
}: {
  board: Board;
  boardRole: BoardRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const isOwner = boardRole === "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Board-Einstellungen</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              Allgemein
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="members" className="flex-1">
                Mitglieder
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="general" className="mt-4">
            <GeneralTab
              board={board}
              isOwner={isOwner}
              router={router}
              onClose={() => onOpenChange(false)}
            />
          </TabsContent>
          {isOwner && (
            <TabsContent value="members" className="mt-4">
              <MembersTab boardId={board.id} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── General Tab ─────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function GeneralTab({
  board,
  isOwner,
  router,
  onClose,
}: {
  board: Board;
  isOwner: boolean;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const [name, setName] = useState(board.name);
  const [slug, setSlug] = useState(board.slug);
  const [icon, setIcon] = useState(board.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(board.iconUrl ?? null);
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  const handleSave = async () => {
    if (!name.trim() || !slugValid) return;
    setSaving(true);
    try {
      const updated = await updateBoard(board.id, {
        name,
        slug,
        icon,
        iconUrl,
      });
      toast.success("Board aktualisiert");
      router.refresh();
      if (updated.slug !== board.slug) {
        router.replace(`/board/${updated.slug}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Slug already in use"
          ? "Dieser Link wird bereits verwendet"
          : "Fehler beim Aktualisieren";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (checked: boolean) => {
    setLoading(true);
    try {
      await updateBoard(board.id, { isPublic: checked });
      setIsPublic(checked);
      router.refresh();
      toast.success(
        checked ? "Board ist jetzt öffentlich" : "Board ist jetzt privat",
      );
    } catch {
      toast.error("Fehler beim Ändern");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/board/${board.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link kopiert");
  };

  const handleDelete = async () => {
    try {
      await deleteBoard(board.id);
      router.refresh();
      toast.success("Board gelöscht");
      onClose();
      router.push("/dashboard");
    } catch {
      toast.error("Fehler beim Löschen");
    }
  };

  const hasChanges =
    name !== board.name ||
    slug !== board.slug ||
    icon !== board.icon ||
    iconUrl !== (board.iconUrl ?? null);

  return (
    <div className="space-y-6">
      {/* Name, Slug, Icon (owner only) */}
      {isOwner && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-board-name">Name</Label>
            <Input
              id="settings-board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-board-slug">Link / URL</Label>
            <div className="flex items-center gap-0">
              <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs text-muted-foreground whitespace-nowrap">
                /board/
              </span>
              <Input
                id="settings-board-slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="rounded-l-none"
              />
            </div>
            {slug && !slugValid && (
              <p className="text-xs text-destructive">
                Nur Kleinbuchstaben, Zahlen und Bindestriche
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Icon</Label>
            <IconPicker
              value={icon}
              onChange={setIcon}
              iconUrl={iconUrl}
              onIconUrlChange={setIconUrl}
            />
          </div>
          {hasChanges && (
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !slugValid}
              className="w-full">
              {saving ? "Speichern..." : "Speichern"}
            </Button>
          )}
        </div>
      )}

      {/* Visibility */}
      {isOwner && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {isPublic ? (
              <Globe className="size-5 text-primary" />
            ) : (
              <Lock className="size-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Sichtbarkeit</p>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "Jeder mit dem Link kann dieses Board sehen"
                  : "Nur du und Mitglieder können dieses Board sehen"}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={toggleVisibility}
            disabled={loading}
          />
        </div>
      )}

      {/* Board Link (always visible) */}
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <Input
          readOnly
          value={`${typeof window !== "undefined" ? window.location.origin : ""}/board/${board.slug}`}
          className="text-xs"
        />
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="mr-2 size-3.5" />
          Kopieren
        </Button>
      </div>

      {/* Delete */}
      {isOwner && (
        <div className="rounded-lg border border-destructive/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">
                Board löschen
              </p>
              <p className="text-xs text-muted-foreground">
                Alle Kategorien, Gruppen und Kacheln werden gelöscht.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 size-3.5" />
                  Löschen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Board löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alle Kategorien, Gruppen und Kacheln in diesem Board werden
                    ebenfalls gelöscht. Diese Aktion kann nicht rückgängig
                    gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ boardId }: { boardId: string }) {
  const [owner, setOwner] = useState<{
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null>(null);
  const [members, setMembers] = useState<BoardMemberWithUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<
    { id: string; name: string; email: string; image: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    try {
      const [memberData, users] = await Promise.all([
        getBoardMembers(boardId),
        getAvailableUsersForBoard(boardId),
      ]);
      setOwner(memberData.owner);
      setMembers(memberData.members);
      setAvailableUsers(users);
    } catch {
      toast.error("Fehler beim Laden der Mitglieder");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (boardId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const member = await addBoardMember(boardId, selectedUserId, role);
      setMembers((prev) => [...prev, member]);
      setAvailableUsers((prev) => prev.filter((u) => u.id !== selectedUserId));
      setSelectedUserId("");
      toast.success("Mitglied hinzugefügt");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Hinzufügen",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    newRole: "viewer" | "editor",
  ) => {
    try {
      const updated = await updateBoardMemberRole(memberId, newRole);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
      toast.success("Rolle geändert");
    } catch {
      toast.error("Fehler beim Ändern der Rolle");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const removed = members.find((m) => m.id === memberId);
      await removeBoardMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      if (removed) {
        setAvailableUsers((prev) =>
          [...prev, removed.user].sort((a, b) => a.name.localeCompare(b.name)),
        );
      }
      toast.success("Mitglied entfernt");
    } catch {
      toast.error("Fehler beim Entfernen");
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Lade Mitglieder...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add member */}
      <div className="space-y-2">
        <Label className="text-xs">Benutzer</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Benutzer auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                Keine verfügbaren Benutzer
              </div>
            ) : (
              availableUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  <span className="flex items-center gap-2">
                    <span>{u.name}</span>
                    <span className="text-muted-foreground">({u.email})</span>
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Select
            value={role}
            onValueChange={(v) => setRole(v as "viewer" | "editor")}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Betrachter</SelectItem>
              <SelectItem value="editor">Redakteur</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={adding || !selectedUserId}
            onClick={handleAdd}>
            <UserPlus className="mr-2 size-3.5" />
            Hinzufügen
          </Button>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">
                {owner.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{owner.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {owner.email}
              </p>
            </div>
            <Badge variant="outline" className="gap-1 shrink-0">
              <Crown className="size-3" />
              Besitzer
            </Badge>
          </div>
        )}

        {/* Members */}
        {members.map((member) => (
          <div
            key={member.id}
            className="relative rounded-lg border p-3 space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 size-7 text-destructive"
              onClick={() => handleRemove(member.id)}>
              <Trash2 className="size-3.5" />
            </Button>
            <div className="flex items-center gap-2 pr-8">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="text-xs">
                  {member.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.user.email}
                </p>
              </div>
            </div>
            <div className="ml-10">
              <Select
                value={member.role}
                onValueChange={(v) =>
                  handleRoleChange(member.id, v as "viewer" | "editor")
                }>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <span className="flex items-center gap-1.5">
                      <Eye className="size-3" />
                      Betrachter
                    </span>
                  </SelectItem>
                  <SelectItem value="editor">
                    <span className="flex items-center gap-1.5">
                      <Pencil className="size-3" />
                      Redakteur
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Noch keine Mitglieder hinzugefügt
          </p>
        )}
      </div>
    </div>
  );
}
