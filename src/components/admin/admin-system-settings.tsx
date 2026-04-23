"use client";

import { useState, useTransition } from "react";
import {
  setSystemSetting,
  updateSmtpSettings,
  sendTestSmtpEmail,
  type SmtpSettings,
} from "@/lib/actions/settings";
import { useTranslation } from "@/components/locale-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AdminSystemSettings({
  registrationEnabled: initialEnabled,
  appUrl: initialAppUrl,
  smtp: initialSmtp,
}: {
  registrationEnabled: boolean;
  appUrl: string;
  smtp: SmtpSettings;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [appUrl, setAppUrl] = useState(initialAppUrl);
  const [pending, startTransition] = useTransition();
  const [savingUrl, startSavingUrl] = useTransition();
  const { t } = useTranslation();

  const handleSaveAppUrl = () => {
    startSavingUrl(async () => {
      try {
        await setSystemSetting("app_url", appUrl.trim());
        toast.success(t("admin.appUrlSaved"));
      } catch {
        toast.error(t("error.updateFailed"));
      }
    });
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    startTransition(async () => {
      try {
        await setSystemSetting(
          "registration_enabled",
          checked ? "true" : "false",
        );
        toast.success(t("admin.registrationSaved"));
      } catch {
        setEnabled(!checked);
        toast.error(t("error.updateFailed"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.systemSettings")}</CardTitle>
          <CardDescription>{t("admin.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="registration-toggle"
                className="text-sm font-medium">
                {t("admin.registrationEnabled")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("admin.registrationEnabledDesc")}
              </p>
            </div>
            <Switch
              id="registration-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-url" className="text-sm font-medium">
              {t("admin.appUrl")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("admin.appUrlDesc")}
            </p>
            <div className="flex gap-2">
              <Input
                id="app-url"
                type="url"
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={savingUrl}
              />
              <Button
                type="button"
                onClick={handleSaveAppUrl}
                disabled={savingUrl || appUrl.trim() === initialAppUrl}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <SmtpCard initial={initialSmtp} />
    </div>
  );
}

function SmtpCard({ initial }: { initial: SmtpSettings }) {
  const { t } = useTranslation();
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(String(initial.port));
  const [secure, setSecure] = useState(initial.secure);
  const [user, setUser] = useState(initial.user);
  const [password, setPassword] = useState("");
  const [clearPassword, setClearPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(initial.hasPassword);
  const [from, setFrom] = useState(initial.from);
  const [testTo, setTestTo] = useState("");
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();

  const handleSave = () => {
    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
      toast.error(t("admin.smtpPortInvalid"));
      return;
    }
    startSaving(async () => {
      try {
        await updateSmtpSettings({
          host: host.trim(),
          port: portNum,
          secure,
          user: user.trim(),
          password: clearPassword ? undefined : password || undefined,
          clearPassword,
          from: from.trim(),
        });
        if (clearPassword) {
          setHasPassword(false);
        } else if (password) {
          setHasPassword(true);
        }
        setPassword("");
        setClearPassword(false);
        toast.success(t("admin.smtpSaved"));
      } catch {
        toast.error(t("error.updateFailed"));
      }
    });
  };

  const handleTest = () => {
    const to = testTo.trim();
    if (!to) {
      toast.error(t("admin.smtpTestEmailRequired"));
      return;
    }
    startTesting(async () => {
      try {
        await sendTestSmtpEmail(to);
        toast.success(t("admin.smtpTestSent"));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : t("error.updateFailed");
        toast.error(msg);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.smtpTitle")}</CardTitle>
        <CardDescription>{t("admin.smtpDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="smtp-host" className="text-sm">
              {t("admin.smtpHost")}
            </Label>
            <Input
              id="smtp-host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.example.com"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-port" className="text-sm">
              {t("admin.smtpPort")}
            </Label>
            <Input
              id="smtp-port"
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(e) => setPort(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <Label htmlFor="smtp-secure" className="text-sm font-medium">
              {t("admin.smtpSecure")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("admin.smtpSecureDesc")}
            </p>
          </div>
          <Switch
            id="smtp-secure"
            checked={secure}
            onCheckedChange={setSecure}
            disabled={saving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="smtp-user" className="text-sm">
              {t("admin.smtpUser")}
            </Label>
            <Input
              id="smtp-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="off"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="smtp-pass" className="text-sm">
              {t("admin.smtpPassword")}
            </Label>
            <Input
              id="smtp-pass"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.target.value) setClearPassword(false);
              }}
              placeholder={
                hasPassword
                  ? t("admin.smtpPasswordSet")
                  : t("admin.smtpPasswordEmpty")
              }
              autoComplete="new-password"
              disabled={saving || clearPassword}
            />
            {hasPassword && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={clearPassword}
                  onChange={(e) => {
                    setClearPassword(e.target.checked);
                    if (e.target.checked) setPassword("");
                  }}
                  disabled={saving}
                />
                {t("admin.smtpClearPassword")}
              </label>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="smtp-from" className="text-sm">
            {t("admin.smtpFrom")}
          </Label>
          <Input
            id="smtp-from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="Selfstack <noreply@example.com>"
            disabled={saving}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <Label htmlFor="smtp-test" className="text-sm font-medium">
            {t("admin.smtpTest")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("admin.smtpTestDesc")}
          </p>
          <div className="flex gap-2">
            <Input
              id="smtp-test"
              type="email"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="you@example.com"
              disabled={testing}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}>
              {testing ? t("admin.smtpTesting") : t("admin.smtpSendTest")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
