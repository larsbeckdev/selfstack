import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BoardSettings } from "@/components/settings/board-settings";

export default async function BoardSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const boards = await db.board.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  });

  return <BoardSettings boards={boards} />;
}
