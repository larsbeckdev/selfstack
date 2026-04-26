import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewAllBoards } from "@/lib/permissions";
import {
  ICONS_DIR,
  ICONS_PUBLIC_PREFIX,
  parseIconPath,
  scopeFolder,
  scopePublicPrefix,
  type MediaScope,
} from "@/lib/media-paths";

export type MediaFile = {
  /** Filename only, e.g. "diagram.png". */
  name: string;
  /** Full public URL, e.g. "/uploads/icons/users/abc/diagram.png". */
  url: string;
  /** Path relative to the icons root (used as a stable identifier). */
  path: string;
  size: number;
  type: string;
  createdAt: string;
  scope: "user" | "org" | "legacy";
  /** Set when scope === "user": owner user id. */
  userId?: string;
  /** Set when scope === "user": owner display name (best-effort, may be empty if user was deleted). */
  userName?: string;
  /** Set when scope === "org". */
  orgId?: string;
  /** Set when scope === "org": display name of the organization. */
  orgName?: string;
};

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"];

function getMediaType(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  return map[ext] || "application/octet-stream";
}

function listFolder(
  scope: MediaScope,
  orgInfo?: { id: string; name: string },
  userInfo?: { id: string; name: string },
): MediaFile[] {
  const folder = scopeFolder(scope);
  if (!existsSync(folder)) return [];
  const prefix = scopePublicPrefix(scope);

  return readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) =>
      IMAGE_EXTS.includes(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => {
      const filePath = path.join(folder, entry.name);
      const stat = statSync(filePath);
      const ext = path.extname(entry.name).toLowerCase();
      const relPath = `${prefix.slice(ICONS_PUBLIC_PREFIX.length + 1)}${
        scope.kind === "legacy" ? "" : "/"
      }${entry.name}`.replace(/^\/+/, "");
      const out: MediaFile = {
        name: entry.name,
        url: `${prefix}/${entry.name}`,
        path: relPath,
        size: stat.size,
        type: getMediaType(ext),
        createdAt: stat.birthtime.toISOString(),
        scope: scope.kind,
      };
      if (scope.kind === "org" && orgInfo) {
        out.orgId = orgInfo.id;
        out.orgName = orgInfo.name;
      }
      if (scope.kind === "user") {
        out.userId = scope.userId;
        if (userInfo) out.userName = userInfo.name;
      }
      return out;
    });
}

export async function GET() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!existsSync(ICONS_DIR)) {
    return Response.json({ files: [] });
  }

  const role = session.user.role;
  const isAllSeeing = canViewAllBoards(role);
  const files: MediaFile[] = [];

  // 1) User scope — current user always sees their own files. Admins+ see all users.
  if (isAllSeeing) {
    const usersRoot = path.join(ICONS_DIR, "users");
    if (existsSync(usersRoot)) {
      const dirs = readdirSync(usersRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
      const users = dirs.length
        ? await db.user.findMany({
            where: { id: { in: dirs } },
            select: { id: true, name: true },
          })
        : [];
      const userMap = new Map(users.map((u) => [u.id, u]));
      for (const userId of dirs) {
        files.push(
          ...listFolder(
            { kind: "user", userId },
            undefined,
            userMap.get(userId),
          ),
        );
      }
    }
  } else {
    files.push(
      ...listFolder({ kind: "user", userId: session.user.id }, undefined, {
        id: session.user.id,
        name: session.user.name,
      }),
    );
  }

  // 2) Org scope — list every org folder the user is a member of (or all for admins+).
  const orgsRoot = path.join(ICONS_DIR, "orgs");
  if (existsSync(orgsRoot)) {
    let orgs: { id: string; name: string }[];
    if (isAllSeeing) {
      orgs = await db.organization.findMany({
        select: { id: true, name: true },
      });
    } else {
      const memberships = await db.organizationMember.findMany({
        where: { userId: session.user.id },
        select: { organization: { select: { id: true, name: true } } },
      });
      orgs = memberships.map((m) => m.organization);
    }
    for (const org of orgs) {
      files.push(...listFolder({ kind: "org", orgId: org.id }, org));
    }
  }

  // 3) Legacy root — only admins+ see unattributed files.
  if (isAllSeeing) {
    files.push(...listFolder({ kind: "legacy" }));
  }

  files.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return Response.json({ files });
}

export async function DELETE(request: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    path?: string;
  } | null;
  if (!body) {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  // Accept either a {path: "users/<id>/<file>"} relative path or a legacy {name: "<file>"}.
  const input = body.path || body.name;
  if (!input || typeof input !== "string") {
    return Response.json({ error: "Ungültige Datei" }, { status: 400 });
  }

  const parsed = parseIconPath(input);
  if (!parsed) {
    return Response.json({ error: "Ungültiger Dateipfad" }, { status: 400 });
  }

  // Authorize per scope.
  const role = session.user.role;
  const isAllSeeing = canViewAllBoards(role);
  if (!isAllSeeing) {
    if (parsed.scope.kind === "legacy") {
      return Response.json({ error: "Keine Berechtigung" }, { status: 403 });
    }
    if (
      parsed.scope.kind === "user" &&
      parsed.scope.userId !== session.user.id
    ) {
      return Response.json({ error: "Keine Berechtigung" }, { status: 403 });
    }
    if (parsed.scope.kind === "org") {
      const membership = await db.organizationMember.findUnique({
        where: {
          orgId_userId: {
            orgId: parsed.scope.orgId,
            userId: session.user.id,
          },
        },
        select: { role: true },
      });
      if (!membership) {
        return Response.json({ error: "Keine Berechtigung" }, { status: 403 });
      }
    }
  }

  const folder = scopeFolder(parsed.scope);
  const filePath = path.join(folder, parsed.filename);

  // Ensure the resolved path is still under ICONS_DIR.
  const resolved = path.resolve(filePath);
  const root = path.resolve(ICONS_DIR);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return Response.json({ error: "Ungültiger Dateipfad" }, { status: 400 });
  }

  if (!existsSync(filePath)) {
    return Response.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }

  unlinkSync(filePath);

  return Response.json({ success: true });
}
