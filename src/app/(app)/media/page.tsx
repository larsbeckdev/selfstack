import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { MediaLibrary } from "@/components/media/media-library";

export default async function MediaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medien</h1>
        <p className="text-muted-foreground">
          Hochgeladene Icons und Bilder verwalten
        </p>
      </div>
      <MediaLibrary />
    </div>
  );
}
