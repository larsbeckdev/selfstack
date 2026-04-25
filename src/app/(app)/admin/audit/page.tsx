import { getAuditLog } from "@/lib/actions/audit";
import { getLocale, getTranslator } from "@/lib/i18n/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const EVENT_LABELS: Record<"de" | "en", Record<string, string>> = {
  de: {
    "login.success": "Login OK",
    "login.failed": "Login fehlgeschlagen",
    "login.2fa.failed": "2FA fehlgeschlagen",
    logout: "Logout",
    register: "Registrierung",
  },
  en: {
    "login.success": "Login OK",
    "login.failed": "Login failed",
    "login.2fa.failed": "2FA failed",
    logout: "Logout",
    register: "Registered",
  },
};

function formatDate(d: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

function eventVariant(
  event: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (event === "login.success") return "default";
  if (event.endsWith(".failed")) return "destructive";
  if (event === "register") return "secondary";
  return "outline";
}

export default async function AuditPage() {
  const [entries, t, locale] = await Promise.all([
    getAuditLog(200),
    getTranslator(),
    getLocale(),
  ]);
  const labels = EVENT_LABELS[locale];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.audit")}</CardTitle>
        <CardDescription>{t("admin.auditDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            {t("admin.auditEmpty")}
          </p>
        ) : (
          <div className="divide-y">
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-1 px-6 py-3 text-sm sm:flex-row sm:items-center sm:gap-4">
                <div className="w-44 shrink-0 text-muted-foreground tabular-nums">
                  {formatDate(e.createdAt, locale)}
                </div>
                <div className="w-32 shrink-0">
                  <Badge variant={eventVariant(e.event)}>
                    {labels[e.event] ?? e.event}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1 break-words">
                  <div className="font-medium">
                    {e.userName ?? e.email ?? "—"}
                  </div>
                  {e.email && e.userName && (
                    <div className="text-xs text-muted-foreground">
                      {e.email}
                    </div>
                  )}
                  {e.message && (
                    <div className="text-xs text-muted-foreground">
                      {e.message}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {e.ip ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
