import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewAllBoards } from "@/lib/permissions";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  sanitizeFilename,
  scopeFolder,
  scopePublicPrefix,
  uniqueFilename,
  type MediaScope,
} from "@/lib/media-paths";

const MAX_FILE_SIZE = 512 * 1024; // 512 KB

export async function POST(request: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return Response.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const orgIdRaw = formData.get("orgId");
  const orgId =
    typeof orgIdRaw === "string" && orgIdRaw.trim() ? orgIdRaw.trim() : null;

  if (!file) {
    return Response.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return Response.json(
      { error: "File type not allowed. Use PNG, JPG, WEBP, SVG, or ICO." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum 512 KB." },
      { status: 400 },
    );
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return Response.json({ error: "Ungültige Dateiendung" }, { status: 400 });
  }

  // Resolve scope: org upload requires membership (or global view rights).
  let scope: MediaScope;
  if (orgId) {
    const userRole = session.user.role;
    if (!canViewAllBoards(userRole)) {
      const membership = await db.organizationMember.findUnique({
        where: { orgId_userId: { orgId, userId: session.user.id } },
      });
      if (!membership) {
        return Response.json(
          { error: "Not a member of this organization" },
          { status: 403 },
        );
      }
    } else {
      const org = await db.organization.findUnique({ where: { id: orgId } });
      if (!org)
        return Response.json(
          { error: "Organization not found" },
          { status: 404 },
        );
    }
    scope = { kind: "org", orgId };
  } else {
    scope = { kind: "user", userId: session.user.id };
  }

  const folder = scopeFolder(scope);
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }

  const sanitized = sanitizeFilename(file.name);
  const finalName = uniqueFilename(folder, sanitized, (p) => existsSync(p));
  const filePath = path.join(folder, finalName);

  const buffer = Buffer.from(await file.arrayBuffer());

  // Basic SVG sanitization: reject if it contains script tags or event handlers.
  if (ext === ".svg") {
    const svgContent = buffer.toString("utf-8");
    if (
      /<script/i.test(svgContent) ||
      /on\w+\s*=/i.test(svgContent) ||
      /javascript:/i.test(svgContent)
    ) {
      return Response.json(
        { error: "SVG contains potentially unsafe content" },
        { status: 400 },
      );
    }
  }

  await writeFile(filePath, buffer);

  const url = `${scopePublicPrefix(scope)}/${finalName}`;

  return Response.json({
    url,
    name: finalName,
    originalName: file.name,
    scope: scope.kind,
    orgId: scope.kind === "org" ? scope.orgId : null,
  });
}
