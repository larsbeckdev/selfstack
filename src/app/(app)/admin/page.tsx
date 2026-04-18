import { getAdminStats } from "@/lib/actions/settings";
import { Users, LayoutDashboard, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Benutzer</CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.userCount}</div>
          <p className="text-xs text-muted-foreground">Registrierte Benutzer</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Boards</CardTitle>
          <LayoutDashboard className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.boardCount}</div>
          <p className="text-xs text-muted-foreground">Boards insgesamt</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            Öffentliche Boards
          </CardTitle>
          <Globe className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.publicBoardCount}</div>
          <p className="text-xs text-muted-foreground">Öffentlich sichtbar</p>
        </CardContent>
      </Card>
    </div>
  );
}
