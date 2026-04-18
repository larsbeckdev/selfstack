import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Verwalte Benutzer und Systemeinstellungen
        </p>
      </div>
      <div className="flex flex-col gap-6 md:flex-row">
        <AdminNav />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
