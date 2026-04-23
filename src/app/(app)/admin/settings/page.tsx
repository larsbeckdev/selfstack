import { AdminSystemSettings } from "@/components/admin/admin-system-settings";
import { getAppUrl, getSystemSetting } from "@/lib/actions/settings";

export default async function AdminSettingsPage() {
  const [registrationSetting, appUrl] = await Promise.all([
    getSystemSetting("registration_enabled"),
    getAppUrl(),
  ]);
  const registrationEnabled = registrationSetting !== "false";

  return (
    <AdminSystemSettings
      registrationEnabled={registrationEnabled}
      appUrl={appUrl}
    />
  );
}
