"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MoreHorizontal,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  addOrgMember,
  updateOrgMemberRole,
  removeOrgMember,
} from "@/lib/actions/organization";
import { DEMO_MODE } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { IconPicker } from "@/components/icon-picker";
import { DynamicIcon } from "@/components/dynamic-icon";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

type OrgMember = {
  id: string;
  role: string;
  userId: string;
  orgId: string;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    image: string | null;
  };
};

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  iconUrl: string | null;
  _count: { members: number; boards: number };
  members: OrgMember[];
};

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  email: string;
};

const ROLES = ["owner", "admin", "editor", "member"] as const;
type Role = (typeof ROLES)[number];

function sanitizeSlug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

export function OrgTable({
  orgs,
  allUsers,
}: {
  orgs: OrgRow[];
  allUsers: UserRow[];
}) {
  const { t } = useTranslation();
  const router = useRouter();

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIcon, setNewIcon] = useState("building-2");
  const [newSlugTouched, setNewSlugTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit
  const [editOrg, setEditOrg] = useState<OrgRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editIcon, setEditIcon] = useState("building-2");

  // Members — derived from `orgs` so revalidatePath updates show live.
  const [membersOrgId, setMembersOrgId] = useState<string | null>(null);
  const membersOrg = useMemo(
    () =>
      membersOrgId ? (orgs.find((o) => o.id === membersOrgId) ?? null) : null,
    [orgs, membersOrgId],
  );
  const setMembersOrg = (org: OrgRow | null) =>
    setMembersOrgId(org?.id ?? null);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<Role>("member");

  const resetCreate = () => {
    setNewName("");
    setNewSlug("");
    setNewIcon("building-2");
    setNewSlugTouched(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createOrganization({
        name: newName,
        slug: newSlug,
        icon: newIcon,
      });
      toast.success(t("org.created"));
      setCreateOpen(false);
      resetCreate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (org: OrgRow) => {
    setEditOrg(org);
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditIcon(org.icon);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrg) return;
    setLoading(true);
    try {
      await updateOrganization(editOrg.id, {
        name: editName,
        slug: editSlug,
        icon: editIcon,
      });
      toast.success(t("org.updated"));
      setEditOrg(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orgId: string) => {
    try {
      await deleteOrganization(orgId);
      toast.success(t("org.deleted"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const openMembers = (org: OrgRow) => {
    setMembersOrg(org);
    setAddUserId("");
    setAddRole("member");
  };

  const handleAddMember = async () => {
    if (!membersOrg || !addUserId) return;
    try {
      await addOrgMember(membersOrg.id, addUserId, addRole);
      toast.success(t("org.memberAdded"));
      setAddUserId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleChangeRole = async (userId: string, role: Role) => {
    if (!membersOrg) return;
    try {
      await updateOrgMemberRole(membersOrg.id, userId, role);
      toast.success(t("org.memberRoleUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!membersOrg) return;
    try {
      await removeOrgMember(membersOrg.id, userId);
      toast.success(t("org.memberRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  // Candidates = users not yet member of the open org
  const candidates = useMemo(() => {
    if (!membersOrg) return [];
    const existing = new Set(membersOrg.members.map((m) => m.userId));
    return allUsers.filter((u) => !existing.has(u.id));
  }, [membersOrg, allUsers]);

  const roleLabel = (r: string) =>
    r === "owner"
      ? t("org.roleOwner")
      : r === "admin"
        ? t("org.roleAdmin")
        : r === "editor"
          ? t("org.roleEditor")
          : t("org.roleMember");

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{t("org.title")}</CardTitle>
            <CardDescription>{t("org.description")}</CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t("org.create")}
          </Button>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("org.noOrganizations")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t("org.name")}</TableHead>
                  <TableHead>{t("org.slug")}</TableHead>
                  <TableHead>{t("org.members")}</TableHead>
                  <TableHead>{t("org.boards")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <DynamicIcon
                        name={org.icon}
                        iconUrl={org.iconUrl}
                        className="size-4"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      @{org.slug}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1"
                        onClick={() => openMembers(org)}>
                        <Users className="mr-1 size-3" />
                        {org._count.members}
                      </Button>
                    </TableCell>
                    <TableCell>{org._count.boards}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(org)}>
                            <Building2 className="mr-2 size-3.5" />
                            {t("org.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMembers(org)}>
                            <Users className="mr-2 size-3.5" />
                            {t("org.members")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 size-3.5" />
                                {t("common.delete")}
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("org.deleteTitle")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("org.deleteDesc").replace(
                                    "{name}",
                                    org.name,
                                  )}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("common.cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(org.id)}>
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetCreate();
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("org.createTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">{t("org.name")}</Label>
              <Input
                id="org-name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newSlugTouched)
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">{t("org.slug")}</Label>
              <Input
                id="org-slug"
                value={newSlug}
                onChange={(e) => {
                  setNewSlug(sanitizeSlug(e.target.value));
                  setNewSlugTouched(true);
                }}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                {t("org.slugHelp")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("org.icon")}</Label>
              <IconPicker value={newIcon} onChange={setNewIcon} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? t("common.creating") : t("common.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editOrg}
        onOpenChange={(o) => {
          if (!o) setEditOrg(null);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("org.edit")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name-edit">{t("org.name")}</Label>
              <Input
                id="org-name-edit"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug-edit">{t("org.slug")}</Label>
              <Input
                id="org-slug-edit"
                value={editSlug}
                onChange={(e) => setEditSlug(sanitizeSlug(e.target.value))}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                {t("org.slugHelp")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("org.icon")}</Label>
              <IconPicker value={editIcon} onChange={setEditIcon} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Members dialog */}
      <Dialog
        open={!!membersOrg}
        onOpenChange={(o) => {
          if (!o) setMembersOrg(null);
        }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {membersOrg?.name} — {t("org.members")}
            </DialogTitle>
            <DialogDescription>{t("org.membersDesc")}</DialogDescription>
          </DialogHeader>

          {/* Add member row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label>{t("org.selectUser")}</Label>
              <Select value={addUserId} onValueChange={setAddUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("org.selectUser")} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t("org.noUsersAvailable")}
                    </div>
                  ) : (
                    candidates.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                        {u.username && (
                          <span className="ml-1 text-muted-foreground">
                            (@{u.username})
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("org.memberRole")}</Label>
              <Select
                value={addRole}
                onValueChange={(v) => setAddRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddMember} disabled={!addUserId}>
              <UserPlus className="mr-2 size-4" />
              {t("org.addMember")}
            </Button>
          </div>

          {/* Member list */}
          {membersOrg && membersOrg.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("org.name")}</TableHead>
                  <TableHead>{t("common.email")}</TableHead>
                  <TableHead>{t("org.memberRole")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersOrg.members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.user.name}
                      {m.user.username && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          @{m.user.username}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.user.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          handleChangeRole(m.userId, v as Role)
                        }>
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabel(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => handleRemoveMember(m.userId)}
                        title={t("org.removeMember")}>
                        <UserMinus className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("org.noMembers")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { OrgRow };
