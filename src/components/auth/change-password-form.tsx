"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { forceChangePassword } from "@/lib/actions/auth";
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
import { toast } from "sonner";

export function ChangePasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Passwort muss mindestens 8 Zeichen haben");
      return;
    }

    setLoading(true);
    try {
      await forceChangePassword(newPassword);
      toast.success("Passwort geändert");
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Fehler beim Ändern des Passworts",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="size-6 text-primary" />
        </div>
        <CardTitle>Passwort ändern</CardTitle>
        <CardDescription>
          Du musst dein Passwort ändern, bevor du fortfahren kannst.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Neues Passwort</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              required
              minLength={8}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Passwort bestätigen</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Speichern..." : "Passwort speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
