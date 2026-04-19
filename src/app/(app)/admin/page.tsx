import { getAdminStats } from "@/lib/actions/settings";
import { Users, LayoutDashboard, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslator } from "@/lib/i18n/server";

export default async function AdminPage() {
  const stats = await getAdminStats();
  const t = await getTranslator();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {t("admin.users")}
          </CardTitle>
          <Users className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.userCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("admin.registeredUsers")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {t("nav.boards")}
          </CardTitle>
          <LayoutDashboard className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.boardCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("admin.totalBoards")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {t("public.boards")}
          </CardTitle>
          <Globe className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.publicBoardCount}</div>
          <p className="text-xs text-muted-foreground">
            {t("admin.publicBoards")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
