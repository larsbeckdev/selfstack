import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsers } from "@/lib/actions/settings";
import { getOrganizations } from "@/lib/actions/organization";
import { UserTable } from "@/components/admin/user-table";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [users, orgs] = await Promise.all([getUsers(), getOrganizations()]);

  return (
    <UserTable
      users={users}
      organizations={orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      }))}
      currentUserRole={session.user.role}
      currentUserId={session.user.id}
    />
  );
}
