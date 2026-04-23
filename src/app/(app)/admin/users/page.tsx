import { getUsers } from "@/lib/actions/settings";
import { getOrganizations } from "@/lib/actions/organization";
import { UserTable } from "@/components/admin/user-table";

export default async function AdminUsersPage() {
  const [users, orgs] = await Promise.all([getUsers(), getOrganizations()]);

  return (
    <UserTable
      users={users}
      organizations={orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      }))}
    />
  );
}
