"use client";

import { useState, useTransition } from "react";
import { setSystemSetting } from "@/lib/actions/settings";
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
}: {
  registrationEnabled: boolean;
  appUrl: string;
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
  );
}
