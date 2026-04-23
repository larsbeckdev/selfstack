"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import {
  login,
  loginVerify2FA,
  cancelPendingLogin,
  type AuthState,
} from "@/lib/actions/auth";
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

export function LoginForm({
  registrationEnabled = true,
}: {
  registrationEnabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    {},
  );
  const { t } = useTranslation();

  if (state.requires2FA) {
    return <TwoFactorStep />;
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>
        <CardTitle className="text-xl sm:text-2xl">
          {t("auth.loginTitle")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("auth.loginDescription")}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4 pb-6">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              required
            />
            {state.fieldErrors?.email && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("common.password")}</Label>
            <PasswordInput id="password" name="password" required />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.password[0]}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.loggingIn") : t("auth.login")}
          </Button>
          {registrationEnabled && (
            <p className="text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link href="/register" className="text-primary hover:underline">
                {t("auth.register")}
              </Link>
            </p>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}

function TwoFactorStep() {
  const { t } = useTranslation();
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    loginVerify2FA,
    {},
  );

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Layers className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>
        <CardTitle className="text-xl sm:text-2xl">
          {t("auth.twoFactorTitle")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("auth.twoFactorDesc")}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4 pb-6">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="token">{t("auth.twoFactorCode")}</Label>
            <Input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              required
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("auth.verifying") : t("auth.verify")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => cancelPendingLogin()}>
            {t("common.cancel")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
