import de from "./de";
import en from "./en";
import type { TranslationKey } from "./de";

export type Locale = "de" | "en";

export const locales: Record<Locale, { label: string; flag: string }> = {
  de: { label: "Deutsch", flag: "🇩🇪" },
  en: { label: "English", flag: "🇬🇧" },
};

const translations: Record<Locale, Record<TranslationKey, string>> = { de, en };

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations.de[key] ?? key;
}

export type { TranslationKey };
