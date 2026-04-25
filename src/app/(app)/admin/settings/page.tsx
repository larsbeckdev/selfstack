import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageSystem } from "@/lib/permissions";
import { AdminSystemSettings } from "@/components/admin/admin-system-settings";
import {
  getAppUrl,
  getSystemSetting,
  getSmtpSettings,
} from "@/lib/actions/settings";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSystem(session.user.role)) redirect("/admin");

  const [registrationSetting, appUrl, smtp] = await Promise.all([
    getSystemSetting("registration_enabled"),
    getAppUrl(),
    getSmtpSettings(),
  ]);
  const registrationEnabled = registrationSetting !== "false";

  return (
    <AdminSystemSettings
      registrationEnabled={registrationEnabled}
      appUrl={appUrl}
      smtp={smtp}
    />
  );
}
