import { getTranslator } from "@/lib/i18n/server";

export default async function ImpressumPage() {
  const t = await getTranslator();
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("legal.impressum")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("legal.placeholder")}</p>
    </div>
  );
}
