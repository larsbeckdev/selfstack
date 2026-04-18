"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, Cog } from "lucide-react";
import { useTranslation } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const links = [
    { href: "/admin", label: t("admin.overview"), icon: BarChart3 },
    { href: "/admin/users", label: t("admin.users"), icon: Users },
    { href: "/admin/settings", label: t("admin.systemSettings"), icon: Cog },
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
