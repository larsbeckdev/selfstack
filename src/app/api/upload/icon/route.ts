import { existsSync, mkdirSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { requireAuth } from "@/lib/auth";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
]);

const MAX_FILE_SIZE = 512 * 1024; // 512 KB

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "icons");

export async function POST(request: Request) {
  try {
    await requireAuth();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "File type not allowed. Use PNG, JPG, WEBP, SVG, or ICO." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "File too large. Maximum 512 KB." },
      { status: 400 },
    );
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return Response.json({ error: "Invalid file extension" }, { status: 400 });
  }

  // Generate unique filename: timestamp + random + original extension
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const filePath = path.join(UPLOAD_DIR, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());

  // Basic SVG sanitization: reject if it contains script tags or event handlers
  if (ext === ".svg") {
    const svgContent = buffer.toString("utf-8");
    if (
      /<script/i.test(svgContent) ||
      /on\w+\s*=/i.test(svgContent) ||
      /javascript:/i.test(svgContent)
    ) {
      return Response.json(
        { error: "SVG contains potentially unsafe content" },
        { status: 400 },
      );
    }
  }

  await writeFile(filePath, buffer);

  const url = `/uploads/icons/${uniqueName}`;

  return Response.json({ url });
}
