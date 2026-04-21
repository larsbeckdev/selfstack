"use client";

import { useCallback, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { setSidebarOpen as persistSidebarOpen } from "@/lib/actions/settings";

/**
 * Controlled SidebarProvider that persists the open/collapsed state to the DB
 * whenever it changes. Also keeps cookie behaviour from the base provider.
 */
export function PersistedSidebarProvider({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value);
    persistSidebarOpen(value).catch(() => {
      // best-effort persistence
    });
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={handleOpenChange}>
      {children}
    </SidebarProvider>
  );
}
