import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "icons");

export type MediaFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
};

function getMediaType(ext: string): string {
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!existsSync(UPLOAD_DIR)) {
    return Response.json({ files: [] });
  }

  const entries = readdirSync(UPLOAD_DIR);
  const files: MediaFile[] = entries
    .filter((name) => {
      const ext = path.extname(name).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"].includes(ext);
    })
    .map((name) => {
      const filePath = path.join(UPLOAD_DIR, name);
      const stat = statSync(filePath);
      const ext = path.extname(name).toLowerCase();
      return {
        name,
        url: `/uploads/icons/${name}`,
        size: stat.size,
        type: getMediaType(ext),
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return Response.json({ files });
}

export async function DELETE(request: Request) {
  try {
    await requireAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name || typeof name !== "string") {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }

  // Prevent path traversal
  const safeName = path.basename(name);
  if (safeName !== name || name.includes("..")) {
    return Response.json({ error: "Invalid file name" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, safeName);

  if (!existsSync(filePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  unlinkSync(filePath);

  return Response.json({ success: true });
}
