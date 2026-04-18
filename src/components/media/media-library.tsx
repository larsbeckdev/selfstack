"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Upload,
  Download,
  Trash2,
  Grid3x3,
  List,
  ArrowUpDown,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

type MediaFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
};

type SortBy =
  | "date-desc"
  | "date-asc"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc";
type ViewMode = "grid" | "list";
type FilterType = "all" | "png" | "jpg" | "svg" | "webp" | "ico";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function MediaLibrary() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialFetchDone = useRef(false);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      toast.error("Fehler beim Laden der Medien");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchFiles();
    }
  });

  const handleUpload = async (fileList: FileList) => {
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/upload/icon", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(`${file.name}: ${json.error}`);
        } else {
          uploaded++;
        }
      } catch {
        toast.error(`${file.name}: Upload fehlgeschlagen`);
      }
    }
    if (uploaded > 0) {
      toast.success(
        uploaded === 1
          ? "1 Datei hochgeladen"
          : `${uploaded} Dateien hochgeladen`,
      );
      fetchFiles();
    }
    setUploading(false);
  };

  const handleDelete = async (file: MediaFile) => {
    try {
      const res = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name }),
      });
      if (!res.ok) {
        toast.error("Fehler beim Löschen");
        return;
      }
      toast.success("Datei gelöscht");
      setFiles((prev) => prev.filter((f) => f.name !== file.name));
    } catch {
      toast.error("Fehler beim Löschen");
    }
    setDeleteTarget(null);
  };

  const handleDownload = (file: MediaFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name;
    a.click();
  };

  const filtered = useMemo(() => {
    let result = files;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }

    if (filterType !== "all") {
      result = result.filter((f) => getExtension(f.name) === filterType);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "date-asc":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "size-desc":
          return b.size - a.size;
        case "size-asc":
          return a.size - b.size;
        default:
          return 0;
      }
    });

    return result;
  }, [files, search, sortBy, filterType]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Medien durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="svg">SVG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
            <SelectItem value="ico">ICO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="mr-2 size-3.5" />
            <SelectValue placeholder="Sortierung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Neueste zuerst</SelectItem>
            <SelectItem value="date-asc">Älteste zuerst</SelectItem>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="size-desc">Größte zuerst</SelectItem>
            <SelectItem value="size-asc">Kleinste zuerst</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 rounded-r-none"
            onClick={() => setViewMode("grid")}>
            <Grid3x3 className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 rounded-l-none"
            onClick={() => setViewMode("list")}>
            <List className="size-4" />
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg,.ico"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}>
          <Upload className="mr-2 size-4" />
          {uploading ? "Wird hochgeladen..." : "Hochladen"}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <ImageIcon className="size-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {files.length === 0
              ? "Noch keine Medien hochgeladen"
              : "Keine Medien gefunden"}
          </p>
          {files.length === 0 && (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 size-4" />
              Erstes Icon hochladen
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((file) => (
            <Card
              key={file.name}
              className="group relative overflow-hidden p-0">
              <div className="flex aspect-square items-center justify-center bg-muted/30 p-4">
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="truncate text-xs font-medium">{file.name}</p>
                  </TooltipTrigger>
                  <TooltipContent>{file.name}</TooltipContent>
                </Tooltip>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-7"
                  onClick={() => handleDownload(file)}>
                  <Download className="size-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="size-7"
                  onClick={() => setDeleteTarget(file)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
            <span className="w-8" />
            <span>Name</span>
            <span className="w-20 text-right">Größe</span>
            <span className="w-32 text-right">Datum</span>
            <span className="w-20" />
          </div>
          {filtered.map((file) => (
            <div
              key={file.name}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b px-4 py-2 last:border-b-0 hover:bg-muted/50">
              <div className="flex size-8 items-center justify-center rounded bg-muted/30">
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-h-6 max-w-6 object-contain"
                  loading="lazy"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="truncate text-sm">{file.name}</span>
                </TooltipTrigger>
                <TooltipContent>{file.name}</TooltipContent>
              </Tooltip>
              <span className="w-20 text-right text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </span>
              <span className="w-32 text-right text-xs text-muted-foreground">
                {formatDate(file.createdAt)}
              </span>
              <div className="flex w-20 justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => handleDownload(file)}>
                  <Download className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(file)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File count */}
      {!loading && files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} von {files.length} Dateien
        </p>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Datei löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; wird unwiderruflich gelöscht.
              Icons, die diese Datei verwenden, werden danach nicht mehr
              angezeigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
