"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { forceChangePassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("auth.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t("auth.passwordMinLength"));
      return;
    }

    setLoading(true);
    try {
      await forceChangePassword(newPassword);
      toast.success(t("settings.passwordChanged"));
      router.push("/dashboard");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.passwordChangeFailed"),
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
        <CardTitle>{t("auth.changePasswordTitle")}</CardTitle>
        <CardDescription>{t("auth.changePasswordRequired")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("settings.newPassword")}</Label>
            <PasswordInput
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              required
              minLength={8}
              autoFocus
            />
            <PasswordStrength value={newPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t("auth.confirmPassword")}
            </Label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.saving") : t("auth.savePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
