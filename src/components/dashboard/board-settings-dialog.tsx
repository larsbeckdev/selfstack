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
  RotateCcw,
} from "lucide-react";
import type { Board } from "@/generated/prisma/client";
import type { BoardMemberWithUser, BoardRole } from "@/types";
import {
  updateBoard,
  deleteBoard,
  resetBoardColors,
  getBoardMembers,
  addBoardMember,
  updateBoardMemberRole,
  removeBoardMember,
  getAvailableUsersForBoard,
} from "@/lib/actions/board";
import { getAppUrl } from "@/lib/actions/settings";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoHint } from "@/components/ui/info-hint";
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
import { useTranslation } from "@/components/locale-provider";
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
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("board.settings")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              {t("settings.general")}
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="members" className="flex-1">
                {t("members.title")}
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
  const slashIndex = board.slug.indexOf("/");
  const ownerPrefix = slashIndex >= 0 ? board.slug.slice(0, slashIndex) : "";
  const initialTail =
    slashIndex >= 0 ? board.slug.slice(slashIndex + 1) : board.slug;

  const [name, setName] = useState(board.name);
  const [slugTail, setSlugTail] = useState(initialTail);
  const slug = ownerPrefix ? `${ownerPrefix}/${slugTail}` : slugTail;
  const [icon, setIcon] = useState(board.icon);
  const [iconUrl, setIconUrl] = useState<string | null>(board.iconUrl ?? null);
  const [isPublic, setIsPublic] = useState(board.isPublic);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState<string>("");
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await getAppUrl();
        if (!cancelled) setOrigin(url);
      } catch {
        if (!cancelled && typeof window !== "undefined") {
          setOrigin(window.location.origin);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugTail);

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
      toast.success(t("board.updated"));
      router.refresh();
      if (updated.slug !== board.slug) {
        router.replace(`/board/${updated.slug}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "Slug already in use"
          ? t("board.slugInUse")
          : t("error.updateFailed");
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
        checked ? t("board.publicEnabled") : t("board.publicDisabled"),
      );
    } catch {
      toast.error(t("error.changeFailed"));
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    const base =
      origin || (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${base}/board/${board.slug}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      toast.success(t("common.linkCopied"));
    } else {
      toast.error(t("error.copyFailed"));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBoard(board.id);
      router.refresh();
      toast.success(t("board.deleted"));
      onClose();
      router.push("/dashboard");
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  const handleResetColors = async () => {
    try {
      await resetBoardColors(board.id);
      router.refresh();
      toast.success(t("board.resetColorsDone"));
    } catch {
      toast.error(t("error.updateFailed"));
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
            <div className="flex items-center gap-1.5">
              <Label htmlFor="settings-board-name">{t("common.name")}</Label>
              <InfoHint>{t("validation.nameRule")}</InfoHint>
            </div>
            <Input
              id="settings-board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-board-slug">{t("board.linkSlug")}</Label>
            <div className="flex items-center gap-0">
              <span className="flex h-8 items-center rounded-l-lg border border-r-0 bg-muted px-3 text-xs text-muted-foreground whitespace-nowrap">
                /board/{ownerPrefix ? `${ownerPrefix}/` : ""}
              </span>
              <Input
                id="settings-board-slug"
                value={slugTail}
                onChange={(e) => setSlugTail(slugify(e.target.value))}
                className="rounded-l-none"
              />
            </div>
            {slugTail && !slugValid && (
              <p className="text-xs text-destructive">
                {t("board.slugInvalid")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("tile.icon")}</Label>
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
              {saving ? t("common.saving") : t("common.save")}
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
              <p className="text-sm font-medium">{t("board.visibility")}</p>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? t("board.visibilityPublic")
                  : t("board.visibilityPrivate")}
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
          value={`${origin || (typeof window !== "undefined" ? window.location.origin : "")}/board/${board.slug}`}
          className="text-xs"
        />
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Copy className="mr-2 size-3.5" />
          {t("common.copy")}
        </Button>
      </div>

      {/* Reset Colors */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t("board.resetColors")}</p>
            <p className="text-xs text-muted-foreground">
              {t("board.resetColorsDesc")}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="mr-2 size-3.5" />
                {t("colorPicker.reset")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("board.resetColorsConfirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("board.resetColorsConfirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetColors}>
                  {t("colorPicker.reset")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Delete */}
      {isOwner && (
        <div className="rounded-lg border border-destructive/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">
                {t("board.deleteSection")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("board.deleteSectionDesc")}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 size-3.5" />
                  {t("common.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("board.deleteConfirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("board.deleteConfirmDesc")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    {t("common.delete")}
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
  const { t } = useTranslation();

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
      toast.error(t("members.loadFailed"));
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
      toast.success(t("members.added"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("members.addFailed"));
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
      toast.success(t("members.roleChanged"));
    } catch {
      toast.error(t("members.roleChangeFailed"));
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
      toast.success(t("members.removed"));
    } catch {
      toast.error(t("members.removeFailed"));
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t("members.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add member */}
      <div className="space-y-2">
        <Label className="text-xs">{t("members.user")}</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder={t("members.selectUser")} />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                {t("members.noAvailable")}
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
              <SelectItem value="viewer">{t("members.viewer")}</SelectItem>
              <SelectItem value="editor">{t("members.editor")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={adding || !selectedUserId}
            onClick={handleAdd}>
            <UserPlus className="mr-2 size-3.5" />
            {t("common.add")}
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
              {t("members.owner")}
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
                      {t("members.viewer")}
                    </span>
                  </SelectItem>
                  <SelectItem value="editor">
                    <span className="flex items-center gap-1.5">
                      <Pencil className="size-3" />
                      {t("members.editor")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t("members.empty")}
          </p>
        )}
      </div>
    </div>
  );
}
