import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getTranslator();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">{t("error.notFound")}</p>
        <Button asChild>
          <Link href="/dashboard">{t("error.backToDashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
