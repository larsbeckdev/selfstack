import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/settings/account-settings";
import { getTwoFactorStatus } from "@/lib/actions/settings";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { enabled } = await getTwoFactorStatus();

  return <AccountSettings user={session.user} twoFactorEnabled={enabled} />;
}
