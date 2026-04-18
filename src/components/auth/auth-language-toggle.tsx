"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { locales, type Locale } from "@/lib/i18n";
import { setLocaleCookie } from "@/lib/actions/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthLanguageToggle() {
  const currentLocale = useLocale();
  const [pending, startTransition] = useTransition();

  const handleChange = (locale: Locale) => {
    if (locale === currentLocale) return;
    startTransition(async () => {
      await setLocaleCookie(locale);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={pending}>
          <Languages className="size-4" />
          <span className="sr-only">Language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(
          Object.entries(locales) as [Locale, { label: string; flag: string }][]
        ).map(([key, { label, flag }]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => handleChange(key)}
            className={currentLocale === key ? "bg-accent" : ""}>
            <span className="mr-2">{flag}</span>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
