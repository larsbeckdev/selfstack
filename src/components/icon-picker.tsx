"use client";

import { useState, useMemo, useRef } from "react";
import { icons, Link as LinkIcon, Upload } from "lucide-react";
import { DynamicIcon } from "@/components/dynamic-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const allIconNames = Object.keys(icons).map((name) =>
  name
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, ""),
);

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
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(iconUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      onIconUrlChange?.(json.url);
      setOpen(false);
    } catch {
      toast.error("Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return allIconNames.slice(0, 100);
    const lower = search.toLowerCase();
    return allIconNames.filter((name) => name.includes(lower)).slice(0, 100);
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <DynamicIcon name={value} iconUrl={iconUrl} className="size-4" />
          <span className="truncate">{iconUrl ? "Eigenes Icon" : value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Tabs defaultValue={iconUrl ? "url" : "icons"}>
          <TabsList className="w-full">
            <TabsTrigger value="icons" className="flex-1">
              Icons
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
          <TabsContent value="icons" className="mt-0">
            <div className="p-2">
              <Input
                placeholder="Icon suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-8 gap-1 p-2">
                {filtered.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={`flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${
                      value === name && !iconUrl
                        ? "bg-accent text-foreground ring-1 ring-primary"
                        : ""
                    }`}
                    title={name}
                    onClick={() => {
                      onChange(name);
                      onIconUrlChange?.(null);
                      setOpen(false);
                    }}>
                    <DynamicIcon name={name} className="size-4" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="col-span-8 py-4 text-center text-sm text-muted-foreground">
                    Kein Icon gefunden
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="upload" className="mt-0 p-3 space-y-3">
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
              }}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {uploading
                  ? "Wird hochgeladen..."
                  : "Klicken oder Datei hierher ziehen"}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP, SVG, ICO (max. 512 KB)
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
                  Hochgeladenes Icon
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadPreview(null);
                    onIconUrlChange?.(null);
                  }}
                >
                  Entfernen
                </Button>
              </div>
            )}
          </TabsContent>
          <TabsContent value="url" className="mt-0 p-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="icon-url">Icon-URL</Label>
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
                  Vorschau
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
              Übernehmen
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
                URL entfernen
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
