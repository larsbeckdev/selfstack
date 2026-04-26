import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { MediaLibrary } from "@/components/media/media-library";

export default async function MediaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const u = await db.user.findUnique({
    where: { id: session.user.id },
    select: { mediaView: true },
  });
  const initialView = u?.mediaView === "list" ? "list" : "grid";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medien</h1>
        <p className="text-muted-foreground">
          Hochgeladene Icons und Bilder verwalten
        </p>
      </div>
      <MediaLibrary initialView={initialView} currentUserId={session.user.id} />
    </div>
  );
}
