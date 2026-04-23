"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  beginTwoFactorEnrollment,
  confirmTwoFactorEnrollment,
  disableTwoFactor,
} from "@/lib/actions/settings";
import { useTranslation } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

export function TwoFactorCard({ initialEnabled }: { initialEnabled: boolean }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<{
    secret: string;
    qrCode: string;
  } | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [busy, startTransition] = useTransition();

  const startEnroll = () => {
    startTransition(async () => {
      try {
        const data = await beginTwoFactorEnrollment();
        setSetup(data);
        setToken("");
      } catch {
        toast.error(t("error.updateFailed"));
      }
    });
  };

  const confirmEnroll = () => {
    const clean = token.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(clean)) {
      toast.error(t("auth.twoFactorCodeInvalid"));
      return;
    }
    startTransition(async () => {
      try {
        await confirmTwoFactorEnrollment(clean);
        setEnabled(true);
        setSetup(null);
        setToken("");
        toast.success(t("settings.twoFactorEnabled"));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("error.updateFailed"),
        );
      }
    });
  };

  const disable = () => {
    if (!password) {
      toast.error(t("settings.currentPasswordRequired"));
      return;
    }
    startTransition(async () => {
      try {
        await disableTwoFactor(password);
        setEnabled(false);
        setPassword("");
        toast.success(t("settings.twoFactorDisabled"));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("error.updateFailed"),
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <ShieldCheck className="size-5 text-primary" />
          ) : (
            <ShieldOff className="size-5 text-muted-foreground" />
          )}
          {t("settings.twoFactor")}
        </CardTitle>
        <CardDescription>{t("settings.twoFactorDesc")}</CardDescription>
      </CardHeader>

      {enabled ? (
        <>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("settings.twoFactorActive")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="twofa-disable-pw">
                {t("settings.currentPassword")}
              </Label>
              <PasswordInput
                id="twofa-disable-pw"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="destructive"
              onClick={disable}
              disabled={busy || !password}>
              {t("settings.twoFactorDisable")}
            </Button>
          </CardFooter>
        </>
      ) : setup ? (
        <>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.twoFactorSetupDesc")}
            </p>
            <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
              <Image
                src={setup.qrCode}
                alt="QR code"
                width={200}
                height={200}
                className="rounded"
                unoptimized
              />
              <div className="w-full space-y-1">
                <Label className="text-xs">
                  {t("settings.twoFactorManualCode")}
                </Label>
                <code className="block break-all rounded bg-muted px-2 py-1.5 text-xs font-mono">
                  {setup.secret}
                </code>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="twofa-token">{t("auth.twoFactorCode")}</Label>
              <Input
                id="twofa-token"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setSetup(null)}
              disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmEnroll} disabled={busy}>
              {t("settings.twoFactorConfirm")}
            </Button>
          </CardFooter>
        </>
      ) : (
        <>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t("settings.twoFactorInactive")}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={startEnroll} disabled={busy}>
              {t("settings.twoFactorEnable")}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
