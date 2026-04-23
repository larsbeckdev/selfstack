import { getSystemHealth } from "@/lib/actions/health";
import { SystemHealthView } from "@/components/admin/system-health";

export const dynamic = "force-dynamic";

export default async function AdminHealthPage() {
  const health = await getSystemHealth();
  return <SystemHealthView initial={health} />;
}
