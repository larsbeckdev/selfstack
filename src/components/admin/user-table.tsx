"use client";

import { useState } from "react";
import {
  Copy,
  KeyRound,
  Mail,
  MoreHorizontal,
  Shield,
  Trash2,
  UserPlus,
  User as UserIcon,
} from "lucide-react";
import {
  updateUserRole,
  deleteUser,
  adminCreateUser,
  adminResetPassword,
  adminSendPasswordEmail,
} from "@/lib/actions/settings";
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
import { toast } from "sonner";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  _count: { boards: number };
};

export function UserTable({ users }: { users: UserRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
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

  const resetForm = () => {
    setNewName("");
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
          sendEmail
            ? "Benutzer erstellt – Zugangsdaten per E-Mail versendet"
            : "Benutzer erstellt",
        );
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
      toast.success("Rolle aktualisiert");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId);
      toast.success("Benutzer gelöscht");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  };

  const handleResetPassword = async (user: UserRow) => {
    try {
      const result = await adminResetPassword(user.id);
      setShownPassword(result.generatedPassword);
      setShownUserName(user.name);
      setPasswordDialogOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Zurücksetzen",
      );
    }
  };

  const handleSendResetEmail = async (user: UserRow) => {
    try {
      const result = await adminResetPassword(user.id);
      await adminSendPasswordEmail(user.id, result.generatedPassword);
      toast.success("Neues Passwort per E-Mail versendet");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Versenden");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("In Zwischenablage kopiert");
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Benutzerverwaltung</CardTitle>
            <CardDescription>
              {users.length} Benutzer registriert
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
                Benutzer erstellen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuen Benutzer erstellen</DialogTitle>
                <DialogDescription>
                  Erstelle ein Konto mit Einmalpasswort oder eigenem Passwort.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">Name</Label>
                  <Input
                    id="new-user-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">E-Mail</Label>
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
                    Einmalpasswort generieren (Benutzer muss Passwort beim
                    ersten Login ändern)
                  </Label>
                </div>

                {!generatePw && (
                  <div className="space-y-2">
                    <Label htmlFor="new-user-password">Passwort</Label>
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
                  <Label>Rolle</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Benutzer</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
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
                    Zugangsdaten per E-Mail versenden
                  </Label>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Erstellen..." : "Erstellen"}
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
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Boards</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? (
                        <Shield className="mr-1 size-3" />
                      ) : (
                        <UserIcon className="mr-1 size-3" />
                      )}
                      {user.role === "admin" ? "Admin" : "Benutzer"}
                    </Badge>
                  </TableCell>
                  <TableCell>{user._count.boards}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.role === "user" ? (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, "admin")}>
                            <Shield className="mr-2 size-3.5" />
                            Zum Admin machen
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(user.id, "user")}>
                            <UserIcon className="mr-2 size-3.5" />
                            Zum Benutzer machen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleResetPassword(user)}>
                          <KeyRound className="mr-2 size-3.5" />
                          Passwort zurücksetzen
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSendResetEmail(user)}>
                          <Mail className="mr-2 size-3.5" />
                          Neues Passwort per E-Mail
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2 size-3.5" />
                              Löschen
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Benutzer löschen?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.name} und alle zugehörigen Daten werden
                                unwiderruflich gelöscht.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}>
                                Löschen
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
            <DialogTitle>Einmalpasswort für {shownUserName}</DialogTitle>
            <DialogDescription>
              Dieses Passwort wird nur einmal angezeigt. Der Benutzer muss es
              beim ersten Login ändern.
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
                    toast.success("Passwort per E-Mail versendet");
                  } catch {
                    toast.error("Fehler beim Versenden");
                  }
                }
              }}>
              <Mail className="mr-2 size-4" />
              Per E-Mail versenden
            </Button>
            <Button onClick={() => setPasswordDialogOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
