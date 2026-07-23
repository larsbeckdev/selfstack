"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword, deleteAccount } from "@/lib/actions/settings";
import { logout } from "@/lib/actions/auth";
import { useTranslation } from "@/components/locale-provider";
import { DEMO_MODE } from "@/lib/demo";
import type { SessionUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TwoFactorCard } from "@/components/settings/two-factor-card";

export function AccountSettings({
  user,
  twoFactorEnabled,
}: {
  user: SessionUser;
  twoFactorEnabled: boolean;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      await logout();
    } catch {
      toast.error(t("error.deleteFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.changePassword")}</CardTitle>
          <CardDescription>{t("settings.changePasswordDesc")}</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChange}>
          <CardContent className="space-y-4 pb-6">
            {DEMO_MODE && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
                {t("demo.settingsLocked")}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="current-password">
                {t("settings.currentPassword")}
              </Label>
              <PasswordInput
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={DEMO_MODE}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                required
                minLength={8}
                disabled={DEMO_MODE}
              />
              <PasswordStrength value={newPassword} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || DEMO_MODE}>
              {loading ? t("settings.changing") : t("settings.changePassword")}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <TwoFactorCard initialEnabled={twoFactorEnabled} />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t("settings.deleteAccount")}
          </CardTitle>
          <CardDescription>{t("settings.deleteAccountDesc")}</CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={DEMO_MODE}>
                {t("settings.deleteAccount")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("settings.deleteConfirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.deleteConfirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAccount}>
                  {t("settings.deleteConfirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
