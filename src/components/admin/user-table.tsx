"use client";

import { useState } from "react";
import {
  Copy,
  KeyRound,
  LayoutDashboard,
  Mail,
  MoreHorizontal,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  User as UserIcon,
  Building2,
} from "lucide-react";
import {
  updateUserRole,
  deleteUser,
  adminCreateUser,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
}: {
  users: UserRow[];
  organizations: OrgOption[];
}) {
  const { t, locale } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [generatePw, setGeneratePw] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password display dialog
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [shownPassword, setShownPassword] = useState("");
  const [shownUserName, setShownUserName] = useState("");

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

  const resetForm = () => {
    setNewName("");
    setNewUsername("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("user");
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
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("admin.role")}</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        {t("admin.roleUser")}
                      </SelectItem>
                      <SelectItem value="editor">
                        {t("admin.roleEditor")}
                      </SelectItem>
                      <SelectItem value="admin">
                        {t("admin.roleAdmin")}
                      </SelectItem>
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
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? (
                        <Shield className="mr-1 size-3" />
                      ) : (
                        <UserIcon className="mr-1 size-3" />
                      )}
                      {user.role === "admin"
                        ? t("admin.roleAdminShort")
                        : user.role === "editor"
                          ? t("admin.roleEditor")
                          : t("admin.roleUser")}
                    </Badge>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openBoards(user)}
                          disabled={user._count.boards === 0}>
                          <LayoutDashboard className="mr-2 size-3.5" />
                          {t("admin.viewBoards")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.role !== "user" && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, "user")}>
                            <UserIcon className="mr-2 size-3.5" />
                            {t("admin.makeUser")}
                          </DropdownMenuItem>
                        )}
                        {user.role !== "editor" && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, "editor")}>
                            <UserIcon className="mr-2 size-3.5" />
                            {t("admin.makeEditor")}
                          </DropdownMenuItem>
                        )}
                        {user.role !== "admin" && (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, "admin")}>
                            <Shield className="mr-2 size-3.5" />
                            {t("admin.makeAdmin")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleResetPassword(user)}>
                          <KeyRound className="mr-2 size-3.5" />
                          {t("admin.resetPassword")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSendResetEmail(user)}>
                          <Mail className="mr-2 size-3.5" />
                          {t("admin.sendPasswordEmail")}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </>
  );
}
