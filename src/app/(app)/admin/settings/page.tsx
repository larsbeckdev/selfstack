import { AdminSystemSettings } from "@/components/admin/admin-system-settings";
import { getSystemSetting } from "@/lib/actions/settings";

export default async function AdminSettingsPage() {
  const registrationEnabled =
    (await getSystemSetting("registration_enabled")) !== "false";

  return <AdminSystemSettings registrationEnabled={registrationEnabled} />;
}
