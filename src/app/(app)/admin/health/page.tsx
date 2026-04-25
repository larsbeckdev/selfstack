import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { getSystemHealth } from "@/lib/actions/health";
import { SystemHealthView } from "@/components/admin/system-health";

export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSystem(session.user.role)) redirect("/admin");

  const health = await getSystemHealth();
  return <SystemHealthView initial={health} />;
}
