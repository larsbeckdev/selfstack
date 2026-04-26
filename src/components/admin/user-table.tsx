"use client";

import { useState } from "react";
import {
  Copy,
  KeyRound,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Pencil,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserMinus,
  User as UserIcon,
  Building2,
} from "lucide-react";
import {
  updateUserRole,
  deleteUser,
  adminCreateUser,
  adminUpdateUser,
  adminResetPassword,
  adminSendPasswordEmail,
  getUserBoards,
} from "@/lib/actions/settings";
import {
  addOrgMember,
  updateOrgMemberRole,
  removeOrgMember,
  getUserOrganizations,
} from "@/lib/actions/organization";
import { assignableRoles, canModifyUser, type Role } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordStrength } from "@/components/ui/password-strength";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { useTranslation } from "@/components/locale-provider";
import { DynamicIcon } from "@/components/dynamic-icon";
import { toast } from "sonner";

type UserRow = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: string;
  createdAt: Date;
  _count: { boards: number };
};

type OrgOption = { id: string; name: string; slug: string };

const ORG_ROLES = ["owner", "admin", "editor", "member"] as const;
type OrgRole = (typeof ORG_ROLES)[number];

export function UserTable({
  users,
  organizations,
  currentUserRole,
  currentUserId,
}: {
  users: UserRow[];
  organizations: OrgOption[];
  currentUserRole: string;
  currentUserId: string;
}) {
  const { t, locale } = useTranslation();
  const allowedRoles = assignableRoles(currentUserRole);
  const defaultRole: Role = "guest";
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>(defaultRole);
  const [generatePw, setGeneratePw] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password display dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [shownPassword, setShownPassword] = useState("");
  const [shownUserName, setShownUserName] = useState("");

  // Edit user dialog
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<string>(defaultRole);
  const [editLoading, setEditLoading] = useState(false);

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setEditName(user.name);
    setEditUsername(user.username ?? "");
    setEditEmail(user.email);
    setEditRole(user.role);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      await adminUpdateUser({
        userId: editUser.id,
        name: editName,
        username: editUsername,
        email: editEmail,
        role: editRole as Role,
      });
      toast.success(t("admin.userUpdated"));
      setEditUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setEditLoading(false);
    }
  };

  // Boards dialog (admin viewing a user's boards)
  type UserBoard = {
    id: string;
    name: string;
    slug: string;
    icon: string;
    iconUrl: string | null;
    isPublic: boolean;
    organization: { id: string; name: string; slug: string } | null;
  };
  const [boardsUser, setBoardsUser] = useState<UserRow | null>(null);
  const [userBoards, setUserBoards] = useState<UserBoard[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);

  const openBoards = async (user: UserRow) => {
    setBoardsUser(user);
    setUserBoards([]);
    setBoardsLoading(true);
    try {
      const list = await getUserBoards(user.id);
      setUserBoards(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBoardsLoading(false);
    }
  };

  // Orgs dialog (admin managing a user's org memberships)
  type UserOrgRow = {
    id: string;
    role: string;
    orgId: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      icon: string;
      iconUrl: string | null;
    };
  };
  const [orgsUser, setOrgsUser] = useState<UserRow | null>(null);
  const [userOrgs, setUserOrgs] = useState<UserOrgRow[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [addOrgId, setAddOrgId] = useState("");
  const [addOrgRole, setAddOrgRole] = useState<OrgRole>("member");

  const loadUserOrgs = async (userId: string) => {
    const list = await getUserOrganizations(userId);
    setUserOrgs(list as UserOrgRow[]);
  };

  const openOrgs = async (user: UserRow) => {
    setOrgsUser(user);
    setUserOrgs([]);
    setAddOrgId("");
    setAddOrgRole("member");
    setOrgsLoading(true);
    try {
      await loadUserOrgs(user.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setOrgsLoading(false);
    }
  };

  const handleAddUserOrg = async () => {
    if (!orgsUser || !addOrgId) return;
    try {
      await addOrgMember(addOrgId, orgsUser.id, addOrgRole);
      await loadUserOrgs(orgsUser.id);
      setAddOrgId("");
      toast.success(t("org.memberAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleChangeUserOrgRole = async (orgId: string, role: OrgRole) => {
    if (!orgsUser) return;
    try {
      await updateOrgMemberRole(orgId, orgsUser.id, role);
      await loadUserOrgs(orgsUser.id);
      toast.success(t("org.memberRoleUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleRemoveUserOrg = async (orgId: string) => {
    if (!orgsUser) return;
    try {
      await removeOrgMember(orgId, orgsUser.id);
      await loadUserOrgs(orgsUser.id);
      toast.success(t("org.memberRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const availableOrgsForAdd = organizations.filter(
    (o) => !userOrgs.some((m) => m.orgId === o.id),
  );

  const orgRoleLabel = (r: string) =>
    r === "owner"
      ? t("org.roleOwner")
      : r === "admin"
        ? t("org.roleAdmin")
        : r === "editor"
          ? t("org.roleEditor")
          : t("org.roleMember");

  const globalRoleLabel = (r: string): string => {
    switch (r) {
      case "superadmin":
        return t("admin.roleSuperAdmin");
      case "admin":
        return t("admin.roleAdmin");
      case "editor":
        return t("admin.roleEditor");
      case "member":
        return t("admin.roleMember");
      case "viewer":
        return t("admin.roleViewer");
      case "guest":
        return t("admin.roleGuest");
      default:
        return r;
    }
  };

  const globalRoleIcon = (r: string) =>
    r === "superadmin" ? ShieldCheck : r === "admin" ? Shield : UserIcon;

  const resetForm = () => {
    setNewName("");
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setNewRole(defaultRole);
    setGeneratePw(true);
    setSendEmail(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await adminCreateUser({
        name: newName,
        username: newUsername,
        email: newEmail,
        password: generatePw ? undefined : newPassword,
        role: newRole,
        sendEmail,
      });
      setCreateOpen(false);

      if (result.generatedPassword && !sendEmail) {
        // Show the generated password
        setShownPassword(result.generatedPassword);
        setShownUserName(newName);
        setPasswordDialogOpen(true);
      } else {
        toast.success(
          sendEmail ? t("admin.userCreatedEmailed") : t("admin.userCreated"),
        );
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
      toast.success(t("admin.roleUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      toast.success(t("admin.userDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  };

  const handleResetPassword = async (user: UserRow) => {
    try {
      const result = await adminResetPassword(user.id);
      setShownPassword(result.generatedPassword);
      setShownUserName(user.name);
      setPasswordDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.resetFailed"));
    }
  };

  const handleSendResetEmail = async (user: UserRow) => {
    try {
      const result = await adminResetPassword(user.id);
      await adminSendPasswordEmail(user.id, result.generatedPassword);
      toast.success(t("admin.passwordEmailed"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.sendFailed"));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("admin.copiedToClipboard"));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("admin.userManagement")}</CardTitle>
            <CardDescription>
              {users.length} {t("admin.usersRegistered")}
            </CardDescription>
          </div>
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) resetForm();
            }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-2 size-4" />
                {t("admin.createUser")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.createUserTitle")}</DialogTitle>
                <DialogDescription>
                  {t("admin.createUserDesc")}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">{t("common.name")}</Label>
                  <Input
                    id="new-user-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-username">
                    {t("common.username")}
                  </Label>
                  <Input
                    id="new-user-username"
                    value={newUsername}
                    onChange={(e) =>
                      setNewUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    placeholder="john-doe"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("admin.usernameHelp")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">{t("common.email")}</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="generate-pw"
                    checked={generatePw}
                    onCheckedChange={(checked) =>
                      setGeneratePw(checked === true)
                    }
                  />
                  <Label htmlFor="generate-pw" className="font-normal">
                    {t("admin.generatePassword")}
                  </Label>
                </div>

                {!generatePw && (
                  <div className="space-y-2">
                    <Label htmlFor="new-user-password">
                      {t("common.password")}
                    </Label>
                    <Input
                      id="new-user-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <PasswordStrength value={newPassword} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("admin.role")}</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {globalRoleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-email"
                    checked={sendEmail}
                    onCheckedChange={(checked) =>
                      setSendEmail(checked === true)
                    }
                  />
                  <Label htmlFor="send-email" className="font-normal">
                    {t("admin.sendCredentials")}
                  </Label>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? t("common.creating") : t("common.create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.colName")}</TableHead>
                <TableHead>{t("admin.colUsername")}</TableHead>
                <TableHead>{t("admin.colEmail")}</TableHead>
                <TableHead>{t("admin.colRole")}</TableHead>
                <TableHead>{t("admin.colBoards")}</TableHead>
                <TableHead>{t("admin.colCreated")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {user.username ?? "—"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {(() => {
                      const Icon = globalRoleIcon(user.role);
                      const isSelf = user.id === currentUserId;
                      const canModify = canModifyUser(
                        currentUserRole,
                        user.role,
                      );
                      const editable = canModify && !isSelf;
                      // Make sure the user's current role is selectable in the
                      // dropdown so it remains the visible value.
                      const options = Array.from(
                        new Set([user.role as Role, ...allowedRoles]),
                      );
                      return (
                        <Select
                          value={user.role}
                          disabled={!editable}
                          onValueChange={(r) => handleRoleChange(user.id, r)}>
                          <SelectTrigger
                            size="sm"
                            className="h-8 w-auto min-w-36 gap-2 border-transparent bg-transparent px-2 hover:bg-accent disabled:opacity-100 disabled:cursor-default">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon className="size-3.5" />
                              <span>{globalRoleLabel(user.role)}</span>
                            </span>
                          </SelectTrigger>
                          <SelectContent align="end" position="popper">
                            {options.map((r) => {
                              const ItemIcon = globalRoleIcon(r);
                              return (
                                <SelectItem key={r} value={r}>
                                  <span className="inline-flex items-center gap-2">
                                    <ItemIcon className="size-3.5" />
                                    {globalRoleLabel(r)}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1"
                      onClick={() => openBoards(user)}
                      disabled={user._count.boards === 0}>
                      <LayoutDashboard className="mr-1 size-3" />
                      {user._count.boards}
                    </Button>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString(
                      locale === "en" ? "en-US" : "de-DE",
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const canModify = canModifyUser(
                        currentUserRole,
                        user.role,
                      );
                      const isSelf = user.id === currentUserId;
                      return (
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
                            <DropdownMenuItem
                              onClick={() => openEdit(user)}
                              disabled={!canModify}>
                              <Pencil className="mr-2 size-3.5" />
                              {t("admin.editUser")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openBoards(user)}
                              disabled={user._count.boards === 0}>
                              <LayoutDashboard className="mr-2 size-3.5" />
                              {t("admin.viewBoards")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openOrgs(user)}
                              disabled={!canModify}>
                              <Building2 className="mr-2 size-3.5" />
                              {t("admin.manageOrgs")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user)}
                              disabled={!canModify}>
                              <KeyRound className="mr-2 size-3.5" />
                              {t("admin.resetPassword")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleSendResetEmail(user)}
                              disabled={!canModify}>
                              <Mail className="mr-2 size-3.5" />
                              {t("admin.sendPasswordEmail")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  disabled={!canModify || isSelf}
                                  onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 size-3.5" />
                                  {t("common.delete")}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t("admin.deleteUserTitle")}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("admin.deleteUserDesc").replace(
                                      "{name}",
                                      user.name,
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {t("common.cancel")}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(user.id)}>
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit user dialog */}
      <Dialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.editUserTitle")}</DialogTitle>
            <DialogDescription>{t("admin.editUserDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">{t("common.name")}</Label>
              <Input
                id="edit-user-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-username">{t("common.username")}</Label>
              <Input
                id="edit-user-username"
                value={editUsername}
                onChange={(e) =>
                  setEditUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.usernameHelp")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">{t("common.email")}</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.role")}</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {globalRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditUser(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password display dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.oneTimePasswordFor")} {shownUserName}
            </DialogTitle>
            <DialogDescription>
              {t("admin.oneTimePasswordDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-4">
            <code className="flex-1 text-center text-lg font-bold tracking-wider">
              {shownPassword}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(shownPassword)}>
              <Copy className="size-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                const user = users.find((u) => u.name === shownUserName);
                if (user) {
                  try {
                    await adminSendPasswordEmail(user.id, shownPassword);
                    toast.success(t("admin.passwordEmailed2"));
                  } catch {
                    toast.error(t("admin.sendFailed"));
                  }
                }
              }}>
              <Mail className="mr-2 size-4" />
              {t("admin.sendByEmail")}
            </Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User boards dialog */}
      <Dialog
        open={!!boardsUser}
        onOpenChange={(o) => {
          if (!o) {
            setBoardsUser(null);
            setUserBoards([]);
          }
        }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {boardsUser?.name} — {t("admin.viewBoards")}
            </DialogTitle>
            <DialogDescription>{t("admin.viewBoardsDesc")}</DialogDescription>
          </DialogHeader>
          {boardsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : userBoards.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("nav.noBoards")}
            </p>
          ) : (
            <ul className="divide-y">
              {userBoards.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2">
                  <DynamicIcon
                    name={b.icon}
                    iconUrl={b.iconUrl}
                    className="size-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{b.name}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      /board/{b.slug}
                      {b.organization && (
                        <span className="ml-2">@{b.organization.slug}</span>
                      )}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/board/${b.slug}`}
                      target="_blank"
                      rel="noopener noreferrer">
                      {t("common.open")}
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* User organizations dialog */}
      <Dialog
        open={!!orgsUser}
        onOpenChange={(o) => {
          if (!o) {
            setOrgsUser(null);
            setUserOrgs([]);
          }
        }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {orgsUser?.name} — {t("admin.manageOrgs")}
            </DialogTitle>
            <DialogDescription>{t("admin.manageOrgsDesc")}</DialogDescription>
          </DialogHeader>

          {/* Add-to-org row */}
          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label>{t("org.pickOrg")}</Label>
              <Select value={addOrgId} onValueChange={setAddOrgId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("org.pickOrg")} />
                </SelectTrigger>
                <SelectContent>
                  {availableOrgsForAdd.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t("admin.noOrgsAvailable")}
                    </div>
                  ) : (
                    availableOrgsForAdd.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        @{o.slug} — {o.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:w-40">
              <Label>{t("org.memberRole")}</Label>
              <Select
                value={addOrgRole}
                onValueChange={(v) => setAddOrgRole(v as OrgRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {orgRoleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddUserOrg}
              disabled={!addOrgId}
              className="sm:w-auto">
              <UserPlus className="mr-2 size-4" />
              {t("org.addMember")}
            </Button>
          </div>

          {orgsLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : userOrgs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("admin.userNoOrgs")}
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {userOrgs.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 p-3">
                  <DynamicIcon
                    name={m.organization.icon}
                    iconUrl={m.organization.iconUrl}
                    className="size-4 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {m.organization.name}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      @{m.organization.slug}
                    </div>
                  </div>
                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      handleChangeUserOrgRole(m.orgId, v as OrgRole)
                    }>
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end" position="popper">
                      {ORG_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {orgRoleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => handleRemoveUserOrg(m.orgId)}
                    title={t("org.removeMember")}>
                    <UserMinus className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
