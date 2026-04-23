import { AdminSystemSettings } from "@/components/admin/admin-system-settings";
import {
  getAppUrl,
  getSystemSetting,
  getSmtpSettings,
} from "@/lib/actions/settings";

export default async function AdminSettingsPage() {
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
