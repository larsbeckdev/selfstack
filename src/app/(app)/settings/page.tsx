import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GeneralSettings } from "@/components/settings/general-settings";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <GeneralSettings user={session.user} />;
}
