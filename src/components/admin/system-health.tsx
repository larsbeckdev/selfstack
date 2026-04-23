"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSystemHealth,
  type SystemHealth,
  type HealthStatus,
} from "@/lib/actions/health";
import { useTranslation } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

const CHECK_LABELS: Record<string, string> = {
  database: "Datenbank",
  "database-file": "Datenbank-Datei",
  uploads: "Upload-Verzeichnis",
  "app-url": "App-URL",
  smtp: "SMTP / E-Mail",
  memory: "Speicher",
};

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "ok")
    return <CheckCircle2 className="size-5 text-emerald-500" />;
  if (status === "warn")
    return <AlertTriangle className="size-5 text-amber-500" />;
  return <XCircle className="size-5 text-destructive" />;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const label =
    status === "ok" ? "OK" : status === "warn" ? "Warnung" : "Fehler";
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        status === "ok" &&
          "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
        status === "warn" &&
          "border-amber-500/40 text-amber-600 dark:text-amber-400",
        status === "error" && "border-destructive/40 text-destructive",
      )}>
      {label}
    </Badge>
  );
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function SystemHealthView({ initial }: { initial: SystemHealth }) {
  const [health, setHealth] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { t } = useTranslation();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const next = await getSystemHealth();
        setHealth(next);
      } catch {
        // ignore
      }
    });
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const checkedAt = new Date(health.checkedAt).toLocaleTimeString();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <StatusIcon status={health.overall} />
            <div>
              <CardTitle className="text-base">
                {health.overall === "ok"
                  ? t("admin.healthAllGood")
                  : health.overall === "warn"
                    ? t("admin.healthWarnings")
                    : t("admin.healthErrors")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("admin.healthCheckedAt")}: {checkedAt}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
              className={cn(autoRefresh && "text-primary")}>
              {autoRefresh
                ? t("admin.healthAutoRefreshOn")
                : t("admin.healthAutoRefreshOff")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              {t("admin.healthRefresh")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3">
        {health.checks.map((check) => (
          <Card key={check.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <StatusIcon status={check.status} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {CHECK_LABELS[check.id] ?? check.id}
                    </span>
                    {typeof check.durationMs === "number" && (
                      <span className="text-xs text-muted-foreground">
                        {check.durationMs} ms
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {check.message}
                  </p>
                  {check.details && (
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {Object.entries(check.details).map(([k, v]) => (
                        <div key={k} className="flex gap-1">
                          <dt className="font-medium">{k}:</dt>
                          <dd className="font-mono break-all">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
              <StatusBadge status={check.status} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("admin.healthSystem")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <InfoRow label="Node" value={health.info.nodeVersion} />
            <InfoRow
              label="Platform"
              value={`${health.info.platform} / ${health.info.arch}`}
            />
            <InfoRow label="NODE_ENV" value={health.info.nodeEnv} />
            <InfoRow
              label={t("admin.healthUptime")}
              value={formatUptime(health.info.uptimeSeconds)}
            />
            <InfoRow label="RSS" value={`${health.info.memoryRssMb} MB`} />
            <InfoRow
              label="Heap"
              value={`${health.info.memoryHeapUsedMb} / ${health.info.memoryHeapTotalMb} MB`}
            />
            <InfoRow label="App-URL" value={health.info.appUrl} mono />
            <InfoRow
              label="Datenbank"
              value={health.info.databaseUrl || "—"}
              mono
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("truncate", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
