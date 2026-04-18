import { getUsers } from "@/lib/actions/settings";
import { UserTable } from "@/components/admin/user-table";

export default async function AdminUsersPage() {
  const users = await getUsers();

  return <UserTable users={users} />;
}
