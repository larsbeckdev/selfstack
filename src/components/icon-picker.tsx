"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { icons, Link as LinkIcon, Upload, FolderOpen } from "lucide-react";
import * as TablerIcons from "@tabler/icons-react";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useTranslation } from "@/components/locale-provider";

const lucideNames = Object.keys(icons).map((name) =>
  name
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, ""),
);

// Tabler exports `IconFoo` components; strip the `Icon` prefix and kebab-case.
const tablerNames = Object.keys(TablerIcons)
  .filter((k) => k.startsWith("Icon") && k !== "Icon")
  .map((k) =>
    k
      .slice(4)
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, ""),
  );

type IconLibrary = "lucide" | "tabler" | "selfhst";

// Module-level cache + in-flight promise so the list is fetched at most once
// per browser session and prefetched as soon as the picker is first opened.
let selfhstCache: string[] | null = null;
let selfhstPromise: Promise<string[]> | null = null;
function loadSelfhstIcons(): Promise<string[]> {
  if (selfhstCache && selfhstCache.length > 0)
    return Promise.resolve(selfhstCache);
  if (selfhstPromise) return selfhstPromise;
  selfhstPromise = fetch("/api/icons/selfhst")
    .then(async (r) => {
      if (!r.ok) throw new Error(`selfhst icons HTTP ${r.status}`);
      return (await r.json()) as { icons?: string[] };
    })
    .then((d) => {
      const list = d.icons ?? [];
      // Don't cache an empty result so a transient upstream failure can be
      // retried the next time the picker is opened.
      if (list.length > 0) selfhstCache = list;
      selfhstPromise = null;
      return list;
    })
    .catch(() => {
      selfhstPromise = null;
      return [] as string[];
    });
  return selfhstPromise;
}

export function IconPicker({
  value,
  onChange,
  iconUrl,
  onIconUrlChange,
}: {
  value: string;
  onChange: (icon: string) => void;
  iconUrl?: string | null;
  onIconUrlChange?: (url: string | null) => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<IconLibrary>(() => {
    if (value?.startsWith("tabler:")) return "tabler";
    if (value?.startsWith("selfhst:")) return "selfhst";
    return "lucide";
  });
  const [urlInput, setUrlInput] = useState(
    iconUrl && /^https?:\/\//i.test(iconUrl) && !iconUrl.includes("/uploads/")
      ? iconUrl
      : "",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Selfh.st list (prefetched as soon as the picker opens) ───
  const [selfhstNames, setSelfhstNames] = useState<string[] | null>(
    selfhstCache,
  );
  const [selfhstLoading, setSelfhstLoading] = useState(false);
  useEffect(() => {
    if (!open || selfhstNames !== null) return;
    setSelfhstLoading(true);
    loadSelfhstIcons()
      .then((list) => setSelfhstNames(list))
      .finally(() => setSelfhstLoading(false));
  }, [open, selfhstNames]);

  // ── Media library tab ──────────────────────────────────────────────
  type MediaFile = { name: string; url: string; size: number };
  const [mediaFiles, setMediaFiles] = useState<MediaFile[] | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  useEffect(() => {
    if (!open || mediaFiles !== null) return;
    setMediaLoading(true);
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => setMediaFiles(d.files ?? []))
      .catch(() => setMediaFiles([]))
      .finally(() => setMediaLoading(false));
  }, [open, mediaFiles]);
  const filteredMedia = useMemo(() => {
    if (!mediaFiles) return [];
    if (!mediaSearch) return mediaFiles;
    const q = mediaSearch.toLowerCase();
    return mediaFiles.filter((f) => f.name.toLowerCase().includes(q));
  }, [mediaFiles, mediaSearch]);

  const ACCEPTED_TYPES = ".png,.jpg,.jpeg,.webp,.svg,.ico";

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/icon", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Upload fehlgeschlagen");
        return;
      }
      setUploadPreview(json.url);
      setUploadName(json.originalName || file.name);
      onIconUrlChange?.(json.url);
      setOpen(false);
    } catch {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    const source =
      library === "lucide"
        ? lucideNames
        : library === "tabler"
          ? tablerNames
          : (selfhstNames ?? []);
    if (!search) return source;
    const lower = search.toLowerCase();
    return source.filter((name) => name.includes(lower));
  }, [search, library, selfhstNames]);

  // ── Virtualized grid ────────────────────────────────────────────────
  // The full lucide / tabler / selfh.st sets are 1.7k–6k icons each; rendering
  // them all blocks the UI thread, so we window the visible rows.
  const ICON_COLS = 8;
  const ROW_HEIGHT = 36; // size-8 (32px) + gap-1 (4px)
  const VIEWPORT_HEIGHT = 256; // h-64
  const OVERSCAN = 3;
  const totalRows = Math.ceil(filtered.length / ICON_COLS);
  const [scrollTop, setScrollTop] = useState(0);
  const iconScrollRef = useRef<HTMLDivElement>(null);
  // Reset scroll position whenever the visible list changes. The scroll
  // handler will then update `scrollTop` in state.
  useEffect(() => {
    if (iconScrollRef.current) iconScrollRef.current.scrollTop = 0;
  }, [search, library]);
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + VIEWPORT_HEIGHT) / ROW_HEIGHT) + OVERSCAN,
  );
  const visibleIcons = filtered.slice(startRow * ICON_COLS, endRow * ICON_COLS);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 cursor-pointer">
          <DynamicIcon name={value} iconUrl={iconUrl} className="size-4" />
          <span className="truncate">
            {iconUrl ? uploadName || "Eigenes Icon" : value}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 max-w-[calc(100vw-2rem)] p-2"
        align="start">
        <Tabs defaultValue={iconUrl ? "url" : "icons"}>
          <TabsList className="w-full">
            <TabsTrigger value="icons" className="flex-1">
              Icons
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1">
              <FolderOpen className="mr-1 size-3" />
              Medien
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="mr-1 size-3" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1">
              <LinkIcon className="mr-1 size-3" />
              URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="icons" className="mt-2">
            <div className="flex items-center gap-2 pb-2">
              <Select
                value={library}
                onValueChange={(v) => setLibrary(v as IconLibrary)}>
                <SelectTrigger className="w-[120px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lucide">Lucide</SelectItem>
                  <SelectItem value="tabler">Tabler</SelectItem>
                  <SelectItem value="selfhst">Selfh.st</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Icon suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div
              ref={iconScrollRef}
              className="h-64 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}
              onScroll={(e) =>
                setScrollTop((e.target as HTMLDivElement).scrollTop)
              }>
              {library === "selfhst" && selfhstLoading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("common.loading")}
                </p>
              ) : filtered.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t("iconPicker.noneFound")}
                </p>
              ) : (
                <div
                  style={{
                    height: totalRows * ROW_HEIGHT,
                    position: "relative",
                  }}>
                  <div
                    style={{
                      position: "absolute",
                      top: startRow * ROW_HEIGHT,
                      left: 0,
                      right: 0,
                      display: "grid",
                      gridTemplateColumns: `repeat(${ICON_COLS}, minmax(0, 1fr))`,
                      gap: 4,
                    }}>
                    {visibleIcons.map((name) => {
                      const storedValue =
                        library === "lucide"
                          ? name
                          : library === "tabler"
                            ? `tabler:${name}`
                            : `selfhst:${name}`;
                      const selected = value === storedValue && !iconUrl;
                      const isSelfhst = library === "selfhst";
                      return (
                        <button
                          key={storedValue}
                          type="button"
                          style={
                            isSelfhst
                              ? { backgroundColor: "rgba(148,163,184,0.25)" }
                              : undefined
                          }
                          className={`flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
                            selected
                              ? "bg-accent text-foreground ring-1 ring-primary"
                              : ""
                          }`}
                          title={name}
                          onClick={() => {
                            onChange(storedValue);
                            onIconUrlChange?.(null);
                            setOpen(false);
                          }}>
                          <DynamicIcon name={storedValue} className="size-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="media" className="mt-2">
            <div className="pb-2">
              <Input
                placeholder={t("iconPicker.searchMedia")}
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
              />
            </div>
            <div
              className="h-64 overflow-y-auto overscroll-contain"
              onWheel={(e) => e.stopPropagation()}>
              {mediaLoading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("common.loading")}
                </p>
              ) : filteredMedia.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  {t("iconPicker.noFilesFound")}
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-1">
                  {filteredMedia.map((file) => {
                    const selected = iconUrl === file.url;
                    return (
                      <button
                        key={file.name}
                        type="button"
                        title={file.name}
                        className={`flex aspect-square items-center justify-center rounded-md border p-1 transition-colors hover:border-primary/50 hover:bg-accent ${
                          selected
                            ? "border-primary ring-1 ring-primary"
                            : "border-border/50"
                        }`}
                        onClick={() => {
                          onIconUrlChange?.(file.url);
                          setUploadPreview(file.url);
                          setUploadName(file.name);
                          setOpen(false);
                        }}>
                        <img
                          src={file.url}
                          alt={file.name}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="upload" className="mt-2 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}>
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {uploading
                  ? t("iconPicker.uploading")
                  : t("iconPicker.dropHint")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("iconPicker.uploadConstraints")}
              </p>
            </div>
            {(uploadPreview || iconUrl) && (
              <div className="flex items-center gap-2 rounded-md border p-2">
                <img
                  src={uploadPreview || iconUrl || ""}
                  alt="Preview"
                  className="size-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {uploadName || t("iconPicker.uploadedIcon")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadPreview(null);
                    setUploadName(null);
                    onIconUrlChange?.(null);
                  }}>
                  {t("iconPicker.remove")}
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="url" className="mt-2 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="icon-url">{t("iconPicker.urlLabel")}</Label>
              <Input
                id="icon-url"
                type="url"
                placeholder="https://example.com/icon.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            {urlInput && (
              <div className="flex items-center gap-2 rounded-md border p-2">
                <img
                  src={urlInput}
                  alt="Preview"
                  className="size-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs text-muted-foreground truncate">
                  {t("iconPicker.preview")}
                </span>
              </div>
            )}
            <Button
              className="w-full"
              size="sm"
              disabled={!urlInput}
              onClick={() => {
                onIconUrlChange?.(urlInput || null);
                setOpen(false);
              }}>
              {t("iconPicker.apply")}
            </Button>
            {iconUrl && (
              <Button
                variant="ghost"
                className="w-full"
                size="sm"
                onClick={() => {
                  setUrlInput("");
                  onIconUrlChange?.(null);
                }}>
                {t("iconPicker.removeUrl")}
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
