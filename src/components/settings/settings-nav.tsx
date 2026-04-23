"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, User, Shield, Palette } from "lucide-react";
import { useTranslation } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    { href: "/settings", label: t("settings.general"), icon: Settings },
    {
      href: "/settings/appearance",
      label: t("settings.appearance"),
      icon: Palette,
    },
    { href: "/settings/account", label: t("settings.account"), icon: User },
    { href: "/settings/boards", label: t("settings.boards"), icon: Shield },
  ];

  return (
    <nav className="-mx-2 flex flex-row gap-1 overflow-x-auto px-2 pb-2 md:mx-0 md:w-48 md:flex-col md:overflow-x-visible md:px-0 md:pb-0">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent md:shrink",
            pathname === link.href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
          )}>
          <link.icon className="size-4" />
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
