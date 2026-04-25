/**
 * Central role & permission helpers.
 *
 * Role hierarchy (low → high):
 *   guest → viewer → member → editor → admin → superadmin
 *
 * Quick reference:
 *   - guest:      no boards (cannot see, cannot create).
 *   - viewer:     sees own + assigned + boards of orgs they are member of.
 *                 Cannot create or edit anything.
 *   - member:     viewer rights + can create/edit/delete OWN personal boards.
 *                 Cannot touch org-owned boards (no create/edit/delete).
 *   - editor:     member rights + can EDIT any org board they have access
 *                 to (via org membership). Cannot delete org boards.
 *   - admin:      full board control (create/edit/delete own + any org).
 *                 Sees boards of others. Manages users (except superadmin)
 *                 and organizations. Cannot edit system settings.
 *   - superadmin: ultimate role. The very first user becomes superadmin.
 *                 Can do anything, including system settings.
 */

export const ROLES = [
  "guest",
  "viewer",
  "member",
  "editor",
  "admin",
  "superadmin",
] as const;

export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = {
  guest: 0,
  viewer: 1,
  member: 2,
  editor: 3,
  admin: 4,
  superadmin: 5,
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/** Normalize an unknown string to a known role; falls back to "guest". */
export function asRole(value: string | null | undefined): Role {
  return isRole(value) ? value : "guest";
}

/** Returns true when `role` ranks at least as high as `min`. */
export function hasRole(role: string | null | undefined, min: Role): boolean {
  return RANK[asRole(role)] >= RANK[min];
}

// ─── Coarse capability helpers ──────────────────────────────────────────────

/** Can see boards at all (own + assigned). */
export const canViewBoards = (r: string | null | undefined) =>
  hasRole(r, "viewer");

/** Can create personal boards. */
export const canCreatePersonalBoards = (r: string | null | undefined) =>
  hasRole(r, "member");

/** Can create boards owned by an organization. Admin and above. */
export const canCreateOrgBoards = (r: string | null | undefined) =>
  hasRole(r, "admin");

/** Editors+ may edit org boards even without explicit membership. */
export const canEditAnyOrgBoard = (r: string | null | undefined) =>
  hasRole(r, "editor");

/** Admin and above may DELETE org boards (editor cannot). */
export const canDeleteAnyOrgBoard = (r: string | null | undefined) =>
  hasRole(r, "admin");

/** Admin and above may see/manage every board (incl. other people's). */
export const canViewAllBoards = (r: string | null | undefined) =>
  hasRole(r, "admin");

/** Admin and above may delete other users' personal boards. */
export const canDeleteOthersBoards = (r: string | null | undefined) =>
  hasRole(r, "admin");

/** Access to /admin (user mgmt, orgs). Superadmin always; admin allowed. */
export const canAccessAdminArea = (r: string | null | undefined) =>
  hasRole(r, "admin");

/** Access to system settings, SMTP, app-url, registration toggle, health. */
export const canManageSystem = (r: string | null | undefined) =>
  hasRole(r, "superadmin");

/** Manage users (create, edit, role changes) — admin+, with extra checks
 * forbidding admins from touching superadmins (enforced at action level). */
export const canManageUsers = (r: string | null | undefined) =>
  hasRole(r, "admin");

/** Manage organizations (create/edit/delete + memberships). Admin+. */
export const canManageOrganizations = (r: string | null | undefined) =>
  hasRole(r, "admin");

/**
 * Roles a given actor is allowed to ASSIGN to other users.
 * - admin can assign guest..admin (but NOT superadmin)
 * - superadmin can assign any role
 */
export function assignableRoles(actorRole: string | null | undefined): Role[] {
  if (hasRole(actorRole, "superadmin")) return [...ROLES];
  if (hasRole(actorRole, "admin")) {
    return ROLES.filter((r) => r !== "superadmin");
  }
  return [];
}

/**
 * Whether `actor` may modify `target` (edit, role change, delete, password
 * reset, etc.). Admins cannot touch superadmins. Superadmin can touch anyone.
 */
export function canModifyUser(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined,
): boolean {
  if (hasRole(actorRole, "superadmin")) return true;
  if (hasRole(actorRole, "admin")) return asRole(targetRole) !== "superadmin";
  return false;
}
