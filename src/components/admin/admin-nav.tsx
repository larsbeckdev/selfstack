"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Cog,
  Building2,
  HeartPulse,
  ScrollText,
} from "lucide-react";
import { useTranslation } from "@/components/locale-provider";
import { canManageSystem } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isSuper = canManageSystem(role);

  const links = [
    { href: "/admin", label: t("admin.overview"), icon: BarChart3 },
    { href: "/admin/users", label: t("admin.users"), icon: Users },
    {
      href: "/admin/organizations",
      label: t("admin.organizations"),
      icon: Building2,
    },
    { href: "/admin/audit", label: t("admin.audit"), icon: ScrollText },
    // System settings & health are superadmin-only.
    ...(isSuper
      ? [
          {
            href: "/admin/settings",
            label: t("admin.systemSettings"),
            icon: Cog,
          },
          { href: "/admin/health", label: t("admin.health"), icon: HeartPulse },
        ]
      : []),
  ];

  return (
    <nav className="-mx-2 flex flex-row gap-1 overflow-x-auto px-2 pb-2 md:mx-0 md:w-48 md:flex-col md:overflow-x-visible md:px-0 md:pb-0">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground md:shrink",
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
