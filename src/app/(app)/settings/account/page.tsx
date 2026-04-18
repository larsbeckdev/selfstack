import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/settings/account-settings";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <AccountSettings user={session.user} />;
}
