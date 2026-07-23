"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/settings";
import { useTranslation } from "@/components/locale-provider";
import { DEMO_MODE } from "@/lib/demo";
import type { SessionUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function GeneralSettings({ user }: { user: SessionUser }) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name, username, email });
      toast.success(t("settings.profileUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile")}</CardTitle>
        <CardDescription>{t("settings.profileDesc")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pb-6">
          {DEMO_MODE && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
              {t("demo.settingsLocked")}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="settings-name">{t("common.name")}</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={DEMO_MODE}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-username">{t("common.username")}</Label>
            <Input
              id="settings-username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 40),
                )
              }
              required
              disabled={DEMO_MODE}
            />
            <p className="text-xs text-muted-foreground">
              {t("admin.usernameHelp")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-email">{t("common.email")}</Label>
            <Input
              id="settings-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={DEMO_MODE}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading || DEMO_MODE}>
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
