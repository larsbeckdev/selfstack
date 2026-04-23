"use server";

import fs from "fs/promises";
import path from "path";
import net from "net";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { loadSmtpConfig } from "@/lib/email";
import { getAppUrl } from "@/lib/actions/settings";

export type HealthStatus = "ok" | "warn" | "error";

export type HealthCheck = {
  id: string;
  status: HealthStatus;
  message: string;
  details?: Record<string, string | number | boolean | null | undefined>;
  durationMs?: number;
};

export type SystemHealth = {
  overall: HealthStatus;
  checkedAt: string;
  checks: HealthCheck[];
  info: {
    nodeVersion: string;
    platform: string;
    arch: string;
    uptimeSeconds: number;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
    memoryHeapTotalMb: number;
    nodeEnv: string;
    appUrl: string;
    databaseType: string;
  };
};

function worst(a: HealthStatus, b: HealthStatus): HealthStatus {
  if (a === "error" || b === "error") return "error";
  if (a === "warn" || b === "warn") return "warn";
  return "ok";
}

function redactError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : fallback;
  // Strip absolute paths (POSIX /foo/bar and Windows C:\foo\bar) that Node
  // commonly includes in fs error messages so they don't leak on the health
  // page.
  return msg
    .replace(/[A-Za-z]:\\[^\s'"]+/g, "<path>")
    .replace(/\/[^\s'":]+/g, "<path>")
    .replace(/'[^']+'/g, "'<path>'");
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const [users, boards, tiles, orgs] = await Promise.all([
      db.user.count(),
      db.board.count(),
      db.tile.count(),
      db.organization.count(),
    ]);
    return {
      id: "database",
      status: "ok",
      message: "Datenbank erreichbar",
      durationMs: Date.now() - start,
      details: { users, boards, tiles, organizations: orgs },
    };
  } catch (err) {
    return {
      id: "database",
      status: "error",
      message:
        err instanceof Error ? err.message : "Unbekannter Datenbankfehler",
      durationMs: Date.now() - start,
    };
  }
}

async function checkDatabaseFile(): Promise<HealthCheck> {
  try {
    const raw = process.env.DATABASE_URL ?? "";
    if (!raw.startsWith("file:")) {
      return {
        id: "database-file",
        status: "ok",
        message: "Externe Datenbank konfiguriert",
      };
    }
    const rel = raw.slice(5).replace(/^\.\//, "");
    const abs = path.isAbsolute(rel)
      ? rel
      : path.join(process.cwd(), "prisma", rel);
    const stat = await fs.stat(abs);
    return {
      id: "database-file",
      status: "ok",
      message: "SQLite-Datei gefunden",
      details: {
        sizeMb: Math.round((stat.size / 1024 / 1024) * 100) / 100,
      },
    };
  } catch (err) {
    return {
      id: "database-file",
      status: "error",
      message: redactError(err, "Datenbankdatei nicht gefunden"),
    };
  }
}

async function checkUploads(): Promise<HealthCheck> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    const testFile = path.join(uploadsDir, `.health-${Date.now()}`);
    await fs.writeFile(testFile, "ok");
    await fs.unlink(testFile);

    // Count files in uploads/icons recursively (best effort)
    let iconCount = 0;
    try {
      const entries = await fs.readdir(path.join(uploadsDir, "icons"));
      iconCount = entries.length;
    } catch {
      // ignore
    }
    return {
      id: "uploads",
      status: "ok",
      message: "Upload-Verzeichnis beschreibbar",
      details: { icons: iconCount },
    };
  } catch (err) {
    return {
      id: "uploads",
      status: "error",
      message: redactError(err, "Upload-Verzeichnis nicht beschreibbar"),
    };
  }
}

async function checkAppUrl(): Promise<HealthCheck> {
  try {
    const url = await getAppUrl();
    const parsed = new URL(url);
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return {
      id: "app-url",
      status: isLocal ? "warn" : "ok",
      message: isLocal ? "App-URL zeigt auf localhost" : "App-URL konfiguriert",
      details: { url },
    };
  } catch (err) {
    return {
      id: "app-url",
      status: "error",
      message: err instanceof Error ? err.message : "Ungültige App-URL",
    };
  }
}

function tryConnect(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function checkSmtp(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const cfg = await loadSmtpConfig();
    if (!cfg.host || cfg.host === "localhost") {
      return {
        id: "smtp",
        status: "warn",
        message: "Kein externer SMTP-Server konfiguriert",
        details: { host: cfg.host, port: cfg.port },
      };
    }
    const ok = await tryConnect(cfg.host, cfg.port, 3000);
    return {
      id: "smtp",
      status: ok ? "ok" : "error",
      message: ok
        ? "SMTP-Server erreichbar"
        : `Verbindung zu ${cfg.host}:${cfg.port} fehlgeschlagen`,
      durationMs: Date.now() - start,
      details: {
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        from: cfg.from,
        authConfigured: Boolean(cfg.user && cfg.pass),
      },
    };
  } catch (err) {
    return {
      id: "smtp",
      status: "error",
      message: err instanceof Error ? err.message : "SMTP-Fehler",
      durationMs: Date.now() - start,
    };
  }
}

function checkMemory(): HealthCheck {
  const mem = process.memoryUsage();
  const rssMb = mem.rss / 1024 / 1024;
  const status: HealthStatus =
    rssMb > 1024 ? "warn" : rssMb > 2048 ? "error" : "ok";
  return {
    id: "memory",
    status,
    message: `RSS ${rssMb.toFixed(0)} MB`,
    details: {
      rssMb: Math.round(rssMb),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
  };
}

export async function getSystemHealth(): Promise<SystemHealth> {
  await requireAdmin();

  const [database, databaseFile, uploads, appUrl, smtp] = await Promise.all([
    checkDatabase(),
    checkDatabaseFile(),
    checkUploads(),
    checkAppUrl(),
    checkSmtp(),
  ]);
  const memory = checkMemory();

  const checks = [database, databaseFile, uploads, appUrl, smtp, memory];
  const overall = checks.map((c) => c.status).reduce(worst, "ok");

  const mem = process.memoryUsage();
  const rawDbUrl = process.env.DATABASE_URL ?? "";
  let databaseType = "unknown";
  if (rawDbUrl.startsWith("file:")) databaseType = "sqlite";
  else if (/^postgres(ql)?:/i.test(rawDbUrl)) databaseType = "postgres";
  else if (/^mysql:/i.test(rawDbUrl)) databaseType = "mysql";
  else if (rawDbUrl) databaseType = "external";

  return {
    overall,
    checkedAt: new Date().toISOString(),
    checks,
    info: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.round(process.uptime()),
      memoryRssMb: Math.round(mem.rss / 1024 / 1024),
      memoryHeapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      memoryHeapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      nodeEnv: process.env.NODE_ENV ?? "development",
      appUrl: await getAppUrl(),
      databaseType,
    },
  };
}
