import { getOrganizations } from "@/lib/actions/organization";
import { getUsers } from "@/lib/actions/settings";
import { OrgTable } from "@/components/admin/org-table";

export default async function AdminOrganizationsPage() {
  const [orgs, allUsers] = await Promise.all([getOrganizations(), getUsers()]);

  return <OrgTable orgs={orgs} allUsers={allUsers} />;
}
