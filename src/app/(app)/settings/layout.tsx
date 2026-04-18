import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalte dein Konto und deine Einstellungen
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <SettingsNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
