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
    <nav className="flex flex-row gap-1 md:w-48 md:flex-col">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
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
