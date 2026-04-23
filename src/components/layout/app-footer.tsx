"use client";

import Link from "next/link";
import { useTranslation } from "@/components/locale-provider";

export function AppFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t bg-background/60">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground">
        <span>
          © {year} {t("footer.copyright")}
        </span>
        {/* <div className="flex items-center gap-4">
          <Link href="/impressum" className="hover:text-foreground">
            {t("footer.impressum")}
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground">
            {t("footer.datenschutz")}
          </Link>
        </div> */}
      </div>
    </footer>
  );
}
