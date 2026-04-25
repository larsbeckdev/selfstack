import path from "path";

/** Root folder for all icon uploads (under /public). */
export const ICONS_DIR = path.join(process.cwd(), "public", "uploads", "icons");
export const ICONS_PUBLIC_PREFIX = "/uploads/icons";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
]);

const FILENAME_SANITIZE_REGEX = /[^A-Za-z0-9._\- ]+/g;
const COLLAPSE_DASHES_REGEX = /-{2,}/g;

/**
 * Sanitize a user-supplied filename:
 * - strip any path components
 * - replace disallowed characters with '-'
 * - trim and collapse whitespace/dashes
 * - keep the original extension (lowercased)
 * - cap base length at 80 chars
 *
 * Returns a safe filename (always non-empty, always has an extension if input did).
 */
export function sanitizeFilename(input: string): string {
  // Strip path components.
  const base = path.basename(input).trim();
  const ext = path.extname(base).toLowerCase();
  const stem = base.slice(0, base.length - ext.length);
  let safeStem = stem
    .replace(FILENAME_SANITIZE_REGEX, "-")
    .replace(/\s+/g, " ")
    .replace(COLLAPSE_DASHES_REGEX, "-")
    .replace(/^[-. ]+|[-. ]+$/g, "")
    .slice(0, 80);
  if (!safeStem) safeStem = "file";
  return `${safeStem}${ext}`;
}

export type MediaScope =
  | { kind: "user"; userId: string }
  | { kind: "org"; orgId: string }
  | { kind: "legacy" };

/** Resolve a scope to its absolute folder under ICONS_DIR. */
export function scopeFolder(scope: MediaScope): string {
  switch (scope.kind) {
    case "user":
      return path.join(ICONS_DIR, "users", scope.userId);
    case "org":
      return path.join(ICONS_DIR, "orgs", scope.orgId);
    case "legacy":
      return ICONS_DIR;
  }
}

/** Resolve a scope to its public-facing URL prefix (no trailing slash). */
export function scopePublicPrefix(scope: MediaScope): string {
  switch (scope.kind) {
    case "user":
      return `${ICONS_PUBLIC_PREFIX}/users/${scope.userId}`;
    case "org":
      return `${ICONS_PUBLIC_PREFIX}/orgs/${scope.orgId}`;
    case "legacy":
      return ICONS_PUBLIC_PREFIX;
  }
}

/**
 * Parse a public icon URL into its scope and filename. Returns null if
 * the URL is outside the icons directory or malformed.
 */
export function parseIconPath(input: string): {
  scope: MediaScope;
  filename: string;
} | null {
  let rel = input;
  if (rel.startsWith(ICONS_PUBLIC_PREFIX)) {
    rel = rel.slice(ICONS_PUBLIC_PREFIX.length);
  }
  rel = rel.replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return null;

  const parts = rel.split("/");
  if (parts.length === 1) {
    return { scope: { kind: "legacy" }, filename: parts[0] };
  }
  if (parts.length === 3 && parts[0] === "users") {
    return { scope: { kind: "user", userId: parts[1] }, filename: parts[2] };
  }
  if (parts.length === 3 && parts[0] === "orgs") {
    return { scope: { kind: "org", orgId: parts[1] }, filename: parts[2] };
  }
  return null;
}

/**
 * Find a non-colliding filename in `folder` based on `desired`. If a file
 * with the same name exists, append `-1`, `-2`, ... before the extension.
 * The `existing` set lets callers seed in-flight uploads.
 */
export function uniqueFilename(
  folder: string,
  desired: string,
  exists: (absolutePath: string) => boolean,
): string {
  const ext = path.extname(desired);
  const stem = desired.slice(0, desired.length - ext.length);
  let candidate = desired;
  let i = 1;
  while (exists(path.join(folder, candidate))) {
    candidate = `${stem}-${i}${ext}`;
    i += 1;
    if (i > 9999) {
      candidate = `${stem}-${Date.now()}${ext}`;
      break;
    }
  }
  return candidate;
}
