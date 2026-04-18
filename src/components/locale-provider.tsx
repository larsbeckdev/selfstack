"use client";

import { createContext, useContext, useCallback } from "react";
import { t as translate, type Locale, type TranslationKey } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("de");

export function LocaleProvider({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useTranslation() {
  const locale = useContext(LocaleContext);
  const t = useCallback(
    (key: TranslationKey) => translate(locale, key),
    [locale],
  );
  return { t, locale };
}
