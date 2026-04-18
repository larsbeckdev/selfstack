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
import { toast } from "sonner";

export function AdminSystemSettings({
  registrationEnabled: initialEnabled,
}: {
  registrationEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();

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
      </CardContent>
    </Card>
  );
}
