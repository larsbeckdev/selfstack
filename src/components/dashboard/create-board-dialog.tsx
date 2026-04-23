"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createBoard } from "@/lib/actions/board";
import { getOrganizations } from "@/lib/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconPicker } from "@/components/icon-picker";
import { useTranslation } from "@/components/locale-provider";
import { toast } from "sonner";

type OrgOption = { id: string; name: string; slug: string };

export function CreateBoardDialog({
  children,
  isAdmin = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("layout-dashboard");
  const [loading, setLoading] = useState(false);
  // Admin-only: board owner. "system" = system board; otherwise org id.
  const [ownerKey, setOwnerKey] = useState<string>("system");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open || !isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getOrganizations();
        if (!cancelled)
          setOrgs(list.map((o) => ({ id: o.id, name: o.name, slug: o.slug })));
      } catch {
        // Silent: admin UI elsewhere will surface org errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const orgId = isAdmin && ownerKey !== "system" ? ownerKey : null;
      await createBoard({
        name,
        icon,
        isPublic: false,
        orgId,
      });
      toast.success(t("board.created"));
      router.refresh();
      setOpen(false);
      setName("");
      setIcon("layout-dashboard");
      setOwnerKey("system");
    } catch {
      toast.error(t("error.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("board.newTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-name">{t("common.name")}</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("board.namePlaceholder")}
              required
            />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>{t("org.ownerLabel")}</Label>
              <Select value={ownerKey} onValueChange={setOwnerKey}>
                <SelectTrigger>
                  <SelectValue placeholder={t("org.pickOwner")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("org.ownerSystem")}</SelectItem>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      @{o.slug} — {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("tile.icon")}</Label>
            <IconPicker value={icon} onChange={setIcon} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? t("common.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
